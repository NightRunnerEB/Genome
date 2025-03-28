use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub(crate) struct GenomeConfig {
    pub(crate) admin: Pubkey,
    #[max_len(0)]
    pub(crate) verifier_addresses: Vec<Pubkey>,
    tournament_nonce: u32,
    consensus_rate: f64,
    platform_wallet: Pubkey,
    nome_mint: Pubkey,
    false_precision: f64,
    platform_fee: u64,
    max_organizer_fee: u64,
    min_teams: u16,
    max_teams: u16,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct RoleInfo {
    pub(crate) role: Role,
}

#[derive(PartialEq, Eq, AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub(crate) enum Role {
    #[default]
    None,
    Operator,
    Verifier,
    Organizer,
}
