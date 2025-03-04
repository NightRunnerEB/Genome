use anchor_lang::prelude::*;
use derive::AccountSize;

#[account]
#[derive(AccountSize, Default)]
pub struct GenomeConfig {
    pub admin: Pubkey,
    pub tournament_nonce: u32,
    pub platform_fee: u64,
    pub platform_wallet: Pubkey,
    pub min_entry_fee: u64,
    pub min_sponsor_pool: u64,
    pub max_sponsor_fee: u64,
    pub min_teams: u16,
    pub max_teams: u16,
    pub max_organizer_royalty: u64,
    pub mint: Pubkey
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TournamentData {
    pub organizer_wallet: Pubkey,
    pub sponsor_wallet: Pubkey,
    pub organizer_royalty: u64,
    pub sponsor_pool: u64,
    pub sponsor_fee: u64,
    pub entry_fee: u64,
    pub registration_start: u64,
    pub participant_per_team: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub token: Pubkey,
}

#[account]
#[derive(AccountSize, Default)]
pub struct Tournament {
    id: u32,
    pub organizer_wallet: Pubkey,
    pub sponsor_wallet: Pubkey,
    pub token: Pubkey,
    pub captains: Vec<Pubkey>,
    pub sponsor_pool: u64,
    pub entry_fee: u64,
    pub registration_start: u64,
    pub participant_per_team: u16,
    pub min_teams: u16,
    pub max_teams: u16,
}

impl Tournament {
    pub fn initialize(&mut self, id: &mut u32, tournament_data: TournamentData) {
        *id += 1;
        self.id = *id;
        self.organizer_wallet = tournament_data.organizer_wallet;
        self.sponsor_wallet = tournament_data.sponsor_wallet;
        self.entry_fee = tournament_data.entry_fee;
        self.sponsor_pool = tournament_data.sponsor_pool;
        self.registration_start = tournament_data.registration_start;
        self.participant_per_team = tournament_data.participant_per_team;
        self.min_teams = tournament_data.min_teams;
        self.max_teams = tournament_data.max_teams;
        self.token = tournament_data.token;
    }
}

#[event]
pub struct TournamentCreated {
    pub tournament_id: Pubkey,
    pub organizer_wallet: Pubkey,
    pub sponsor_wallet: Pubkey,
    pub token: Pubkey,
    pub sponsor_pool: u64,    
    pub entry_fee: u64,
    pub registration_start: u64,
    pub participant_per_team: u16,
    pub min_teams: u16,
    pub max_teams: u16,
}

#[account]
pub struct BloomFilterAccount {
    pub data: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum PaymentApproach {
    Direct = 1,
    Remote = 2,
}

#[account]
pub struct RegistrationParams {
    tournament_nonce: [u64; 4],
    participant: Pubkey,
    captain: Pubkey,
    entry_fee: u64,
    teammates: Vec<Pubkey>,
}
