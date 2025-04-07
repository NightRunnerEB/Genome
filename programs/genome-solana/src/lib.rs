#![allow(unexpected_cfgs)]

mod data;
mod team;
mod error;
mod instructions;
mod utils;

use instructions::*;

use anchor_lang::prelude::*;

use data::{GenomeOmniConfig, GenomeSingleConfig, Role, TournamentConfig};
use error::GenomeError;

declare_id!("572G4eB1NNusfqGj3DVTZw1ZooweLBiaA3ko7fLhSsV2");

#[constant]
const GENOME_ROOT: &[u8] = b"genome-0";
#[constant]
const OMNI_CONFIG: &[u8] = b"omni-config";
#[constant]
const SINGLE_CONFIG: &[u8] = b"single-config";
#[constant]
const BLOOM: &[u8] = b"bloom";
#[constant]
const TOURNAMENT: &[u8] = b"tournament";
#[constant]
const TEAM: &[u8] = b"team";
#[constant]
const ROLE: &[u8] = b"role";
#[constant]
const TOKEN: &[u8] = b"token";

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("CB39FqtnDdACX9XkwjsA2gYGd7ZfxjveMewhxRoB9c8k");

#[program]
mod genome_solana {
    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeSingleConfig) -> Result<()> {
        handle_initialize_single(ctx, config_params)
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        handle_grant_role(ctx, role)
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
        handle_revoke_role(ctx, role)
    }

    #[instruction(discriminator = b"aprvtokn")]
    pub fn approve_token(
        ctx: Context<ApproveToken>,
        min_sponsor_pool: u64,
        min_entry_fee: u64,
    ) -> Result<()> {
        handle_approve_token(ctx, min_sponsor_pool, min_entry_fee)
    }

    #[instruction(discriminator = b"bantokn")]
    pub fn ban_token(ctx: Context<BanToken>) -> Result<()> {
        handle_ban_token(ctx)
    }

    #[instruction(discriminator = b"crtntmnt")]
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_config: TournamentConfig,
    ) -> Result<()> {
        handle_create_tournament(ctx, tournament_config)
    }

    #[instruction(discriminator = b"regtmnt")]
    pub fn register_tournament(
        ctx: Context<RegisterParticipant>,
        register_params: RegisterParams,
    ) -> Result<()> {
        handle_register_tournament(ctx, register_params)
    }

    #[instruction(discriminator = b"bloomprc")]
    pub fn set_bloom_precision(ctx: Context<SetBloomPrecision>, new_precision: f64) -> Result<()> {
        handle_set_bloom_precision(ctx, new_precision)
    }

    //
    //
    //  OMNICHAIN INSTRUCTIONS
    //
    //
    //

    #[instruction(discriminator = b"initomni")]
    pub fn initialize_omni(
        ctx: Context<InitializeOmni>,
        omni_config: GenomeOmniConfig,
    ) -> Result<()> {
        handle_initialize_omni(ctx, omni_config)
    }

    #[instruction(discriminator = b"bridgefe")]
    pub fn set_bridge_fee(ctx: Context<SetBridgeFee>, bridge_fee: u64) -> Result<()> {
        handle_set_bridge_fee(ctx, bridge_fee)
    }
}
