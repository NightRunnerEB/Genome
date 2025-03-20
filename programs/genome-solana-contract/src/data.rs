use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GenomeConfig {
    pub admin: Pubkey,
    pub platform_wallet: Pubkey,
    #[max_len(0)]
    pub verifier_addresses: Pubkey,
    pub consensus_rate: u64,
    pub false_precision: u64,
    pub platform_fee: u64,
    pub min_entry_fee: u64,
    pub min_sponsor_pool: u64,
    pub max_organizer_fee: u64,
    pub tournament_nonce: u32,
    pub min_teams: u16,
    pub max_teams: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TournamentData {
    pub organizer: Pubkey,
    pub sponsor: Pubkey,
    pub organizer_fee: u64,
    pub expiration_time: u64,
    pub sponsor_pool: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub asset_mint: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Tournament {
    pub id: u32,
    pub team_count: u32,
    pub organizer: Pubkey,
    pub sponsor: Pubkey,
    pub asset_mint: Pubkey,
    pub organizer_fee: u64,
    pub sponsor_pool: u64,
    pub expiration_time: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub status: TournamentStatus,
    pub bump: u8,
    pub finish_metadata: FinishTournamentMetadata
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, InitSpace)]
pub struct FinishTournamentMetadata {
    #[max_len(0)]
    pub winners: Vec<Pubkey>,
    #[max_len(0)]
    pub rewarded_winners: Vec<bool>,
    pub remaining_prize_pool: u64,
    pub total_prize_pool: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum TournamentStatus {
    New,
    Started,
    Finished,
    Canceled,
}

impl Tournament {
    pub fn initialize(&mut self, id: u32, tournament_data: TournamentData) {
        self.id = id;
        self.organizer = tournament_data.organizer;
        self.organizer_fee = tournament_data.organizer_fee;
        self.sponsor = tournament_data.sponsor;
        self.entry_fee = tournament_data.entry_fee;
        self.expiration_time = tournament_data.expiration_time;
        self.sponsor_pool = tournament_data.sponsor_pool;
        self.team_size = tournament_data.team_size;
        self.min_teams = tournament_data.min_teams;
        self.max_teams = tournament_data.max_teams;
        self.asset_mint = tournament_data.asset_mint;
    }
}

#[account]
pub struct BloomFilter {
    pub data: Vec<u8>,
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
