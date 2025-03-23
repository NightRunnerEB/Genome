use anchor_lang::prelude::*;

use crate::TournamentError;

#[account]
#[derive(InitSpace)]
pub struct GenomeConfig {
    pub admin: Pubkey,
    pub platform_wallet: Pubkey,
    #[max_len(0)]
    pub verifier_addresses: Vec<Pubkey>,
    pub consensus_rate: u64,
    pub false_precision: f64,
    pub platform_fee: u64,
    pub min_entry_fee: u64,
    pub min_sponsor_pool: u64,
    pub max_organizer_royalty: u64,
    pub tournament_nonce: u32,
    pub min_teams: u16,
    pub max_teams: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TournamentData {
    pub organizer: Pubkey,
    pub sponsor: Pubkey,
    pub organizer_royalty: u64,
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
    pub organizer_royalty: u64,
    pub sponsor_pool: u64,
    pub expiration_time: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub status: TournamentStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct FinishTournamentMetadata {
    #[max_len(0)]
    winners: Vec<Pubkey>,
    #[max_len(0)]
    rewarded_winners: Vec<bool>,
    remaining_prize_pool: u64,
    total_prize_pool: u64,
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
        self.organizer_royalty = tournament_data.organizer_royalty;
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

#[derive(Default, Clone, AnchorDeserialize, AnchorSerialize, Debug, PartialEq, InitSpace)]
pub struct ParticipantInfo {
    pub pubkey: Pubkey,
    pub paid_by_captain: bool,
    pub refunded: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Team {
    pub captain: Pubkey,
    #[max_len(0)]
    pub participants: Vec<ParticipantInfo>,
    pub team_size: u16,
}

impl Team {
    pub fn new(captain: Pubkey, team_size: u16) -> Self {
        Self {
            captain,
            participants: vec![],
            team_size,
        }
    }

    pub fn add_participants_by_captain(&mut self, participants: Vec<Pubkey>) -> Result<()> {
        if self.participants.len() + participants.len() > self.team_size as usize {
            return Err(TournamentError::InvalidTeamSize.into());
        }

        for participant in participants {
            self.participants.push(ParticipantInfo {
                pubkey: participant,
                paid_by_captain: true,
                refunded: false,
            });
        }
        Ok(())
    }

    pub fn add_participant(&mut self, participant: Pubkey) -> Result<()> {
        if self.participants.len() >= self.team_size as usize {
            return Err(TournamentError::InvalidTeamSize.into());
        }

        self.participants.push(ParticipantInfo {
            pubkey: participant,
            paid_by_captain: false,
            refunded: false,
        });
        Ok(())
    }

    pub fn _refund_participant(&mut self, participant: &Pubkey) -> Result<usize> {
        let participant_info = self
            .participants
            .iter_mut()
            .find(|p| p.pubkey == *participant)
            .ok_or(TournamentError::ParticipantNotFound)?;

        if participant_info.refunded {
            return Ok(0);
        }
        participant_info.refunded = true;

        if !participant_info.paid_by_captain {
            return Ok(1);
        }

        if *participant == self.captain {
            let count = self
                .participants
                .iter()
                .filter(|p| p.paid_by_captain)
                .count();
            return Ok(count);
        }

        Ok(0)
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
