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
    pub min_prize_pool: u64,
    pub max_sponsor_fee: u64,
    pub min_teams: u16,
    pub max_teams: u16,
    pub max_organizer_royalty: u64,
    pub mint: Pubkey
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TournamentData {
    pub organizer: Pubkey,
    pub sponsor: Pubkey,
    pub organizer_royalty: u64,
    pub prize_pool: u64,
    pub sponsor_fee: u64,
    pub entry_fee: u64,
    pub registration_start: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub token: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Tournament {
    id: u32,
    pub organizer: Pubkey,
    pub organizer_royalty: u64,
    pub sponsor: Pubkey,
    pub token: Pubkey,
    pub prize_pool: u64,
    pub entry_fee: u64,
    pub registration_start: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
}

impl Tournament {
    pub fn initialize(&mut self, id: u32, tournament_data: TournamentData) {
        self.id = id;
        self.organizer = tournament_data.organizer;
        self.organizer_royalty = tournament_data.organizer_royalty;
        self.sponsor = tournament_data.sponsor;
        self.entry_fee = tournament_data.entry_fee;
        self.prize_pool = tournament_data.prize_pool;
        self.registration_start = tournament_data.registration_start;
        self.team_size = tournament_data.team_size;
        self.min_teams = tournament_data.min_teams;
        self.max_teams = tournament_data.max_teams;
        self.token = tournament_data.token;
    }
}

#[event]
pub struct TournamentCreated {
    pub tournament_id: Pubkey,
    pub organizer: Pubkey,
    pub organizer_royalty: u64,
    pub sponsor: Pubkey,
    pub token: Pubkey,
    pub prize_pool: u64,    
    pub entry_fee: u64,
    pub registration_start: u64,
    pub team_size: u16,
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
