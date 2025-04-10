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
    #[max_len(0)]
    pub(crate) verifier_addresses: Vec<Pubkey>,
    pub(crate) verifier_fee: u64,
    pub(crate) tournament_nonce: u32,
    pub(crate) consensus_rate: f64,
    pub(crate) nome_mint: Pubkey,
    pub(crate) false_precision: f64,
    pub(crate) platform_fee: u64,
    pub(crate) max_organizer_fee: u64,
    pub(crate) min_teams: u16,
    pub(crate) max_teams: u16,
}

#[account]
#[derive(InitSpace)]
pub(crate) struct RoleInfo {
    #[max_len(3)]
    pub(crate) roles: Vec<Role>,
    pub(crate) claim: u64,
}

#[derive(PartialEq, AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Default)]
pub(crate) enum Role {
    #[default]
    None,
    Operator,
    Verifier,
    Organizer,
}
