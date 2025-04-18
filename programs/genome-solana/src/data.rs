use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub(crate) struct GenomeOmniConfig {
    pub(crate) admin: Pubkey,
    pub(crate) uts_program: Pubkey,
    pub(crate) bridge_fee: u64,
    pub(crate) genome_chain_id: u64,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct GenomeSingleConfig {
    pub(crate) admin: Pubkey,
    pub(crate) platform_wallet: Pubkey,
    pub(crate) nome_mint: Pubkey,
    pub(crate) verifier_fee: u64,
    pub(crate) tournament_nonce: u32,
    pub(crate) consensus_rate: u64,
    pub(crate) false_precision: u64,
    pub(crate) platform_fee: u64,
    pub(crate) max_organizer_fee: u64,
    pub(crate) min_teams: u16,
    pub(crate) max_teams: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub(crate) struct TournamentConfig {
    pub(crate) organizer_fee: u64,
    pub(crate) expiration_time: u64,
    pub(crate) sponsor_pool: u64,
    pub(crate) entry_fee: u64,
    pub(crate) team_size: u16,
    pub(crate) min_teams: u16,
    pub(crate) max_teams: u16,
    pub(crate) sponsor: Pubkey,
    pub(crate) asset_mint: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct Tournament {
    pub(crate) id: u32,
    pub(crate) organizer: Pubkey,
    pub(crate) team_count: u32,
    pub(crate) config: TournamentConfig,
    pub(crate) status: TournamentStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone, InitSpace)]
pub(crate) enum TournamentStatus {
    New,
    Started,
    Finished,
    Canceled,
}

impl Tournament {
    pub fn initialize(&mut self, id: u32, organizer: Pubkey, tournament_config: TournamentConfig) {
        self.id = id;
        self.organizer = organizer;
        self.config = tournament_config;
    }
}

#[account]
#[derive(InitSpace)]
pub(crate) struct FinishMetaData {
    #[max_len(0)]
    pub(crate) finish_votes: Vec<Pubkey>,
    pub(crate) captain_winner: Pubkey,
    pub(crate) reward: u64,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct TokenInfo {
    pub(crate) asset_mint: Pubkey,
    pub(crate) min_sponsor_pool: u64,
    pub(crate) min_entry_fee: u64,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct RoleInfo {
    #[max_len(3)]
    pub(crate) roles: Vec<Role>,
    pub(crate) claim: u64,
}

#[derive(PartialEq, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub(crate) enum Role {
    Operator,
    Verifier,
    Organizer,
}

impl Role {
    pub fn to_seed(&self) -> &'static [u8] {
        match self {
            Role::Operator => b"operator",
            Role::Verifier => b"verifier",
            Role::Organizer => b"organizer",
        }
    }
}

#[account]
#[derive(InitSpace)]
pub(crate) struct RoleList {
    #[max_len(0)]
    pub(crate) accounts: Vec<Pubkey>,
}

impl RoleList {
    pub(crate) const MAX_VERIFIERS_COUNT: usize = 64;
}

#[account]
#[derive(InitSpace)]
pub(crate) struct Consensus {
    pub(crate) tournament_id: u32,
    pub(crate) start_votes: u64,
    pub(crate) cancel_votes: u64,
    pub(crate) finish_votes: u64,
}

#[account]
pub(crate) struct BloomFilter {
    pub(crate) data: Vec<u8>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use bincode;
    use growable_bloom_filter::GrowableBloom;

    const SIZE: usize = 3200;
    const FALSE_PRECISION: f64 = 0.000065;

    #[test]
    fn test_bloom_serialization_deserialization() {
        let unique = Pubkey::new_unique();
        let mut bloom = GrowableBloom::new(FALSE_PRECISION, SIZE);
        bloom.insert(unique);

        let serialized = bincode::serialize(&bloom).unwrap();
        let deserialized: GrowableBloom = bincode::deserialize(&serialized).unwrap();

        assert!(deserialized.contains(&unique));
    }

    #[test]
    fn test_bloom_filter_account_insertion() {
        let bloom = GrowableBloom::new(FALSE_PRECISION, SIZE);
        let bloom_bytes = bincode::serialize(&bloom).unwrap();
        let mut bloom_filter_account = BloomFilter { data: bloom_bytes };

        let mut bloom_loaded: GrowableBloom =
            bincode::deserialize(&bloom_filter_account.data).unwrap();

        let test_key = Pubkey::new_unique();
        assert!(!bloom_loaded.contains(&test_key));

        let inserted = bloom_loaded.insert(test_key);
        assert!(inserted);

        bloom_filter_account.data = bincode::serialize(&bloom_loaded).unwrap();

        let bloom_checked: GrowableBloom =
            bincode::deserialize(&bloom_filter_account.data).unwrap();
        assert!(bloom_checked.contains(&test_key));
    }

    #[test]
    fn test_bloom_filter_account_false_positive_rate() {
        let mut bloom = GrowableBloom::new(FALSE_PRECISION, SIZE);

        for _ in 0..SIZE {
            bloom.insert(Pubkey::new_unique());
        }

        let serialized = bincode::serialize(&bloom).unwrap();
        let bloom_loaded: GrowableBloom = bincode::deserialize(&serialized).unwrap();

        let test_count = 1000;
        let mut false_positives = 0;
        for _ in 0..test_count {
            if bloom_loaded.contains(&Pubkey::new_unique()) {
                false_positives += 1;
            }
        }
        let observed_fp_rate = false_positives as f64 / test_count as f64;
        assert!(observed_fp_rate < FALSE_PRECISION);
    }
}
