use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GenomeConfig {
    pub admin: Pubkey,
    pub tournament_nonce: u32,
    #[max_len(0)]
    pub verifier_addresses: Vec<Pubkey>,
    pub consensus_rate: f64,
    pub platform_wallet: Pubkey,
    pub nome_mint: Pubkey,
    pub false_precision: f64,
    pub platform_fee: u64,
    pub max_organizer_fee: u64,
    pub min_teams: u16,
    pub max_teams: u16,
}

#[account]
#[derive(InitSpace)]
pub struct RoleInfo {
    pub role: Role,
}

#[derive(PartialEq, Eq, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum Role {
    None,
    Operator,
    Verifier,
    Organizer,
}

impl Default for Role {
    fn default() -> Self {
        Role::None
    }
}
