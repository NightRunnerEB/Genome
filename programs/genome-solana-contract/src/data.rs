use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GenomeConfig {
    pub admin: Pubkey,
    pub platform_wallet: Pubkey,
    pub mint: Pubkey,
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
    pub sponsor_pool: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub token: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Tournament {
    pub organizer: Pubkey,
    pub sponsor: Pubkey,
    pub token: Pubkey,
    pub organizer_royalty: u64,
    pub sponsor_pool: u64,
    pub entry_fee: u64,
    pub team_count: u32,
    pub id: u32,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub status: TournamentStatus,
}

#[derive(PartialEq, Eq, AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub enum TournamentStatus {
    #[default]
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
        self.sponsor_pool = tournament_data.sponsor_pool;
        self.team_size = tournament_data.team_size;
        self.min_teams = tournament_data.min_teams;
        self.max_teams = tournament_data.max_teams;
        self.token = tournament_data.token;
    }
}

#[event]
pub struct TournamentCreated {
    pub id: u32,
    pub organizer: Pubkey,
    pub organizer_royalty: u64,
    pub sponsor: Pubkey,
    pub token: Pubkey,
    pub sponsor_pool: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
}

#[account]
pub struct BloomFilterAccount {
    pub data: Vec<u8>,
}
