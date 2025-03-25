#![allow(unexpected_cfgs)]

mod data;
mod error;
mod instructions;
mod utils;

use anchor_lang::prelude::*;
use instructions::*;

use crate::{
    data::{GenomeConfig, TournamentData},
    error::TournamentError,
};

declare_id!("E8Pa2NFPqUCqZ9PUweRxyMzHcHphyGWwzx7VhDc5dPyv");

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("2WXoMuu6tB48KYHuoUAsNP4dR9c3ardNSQp65Ln8ieu1");

const GENOME_ROOT: &[u8] = b"genome";
const CONFIG: &[u8] = b"config";
const BLOOM: &[u8] = b"bloom";
const TOURNAMENT: &[u8] = b"tournament";
const TEAM: &[u8] = b"team";

#[program]
pub mod genome_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_data: TournamentData,
    ) -> Result<()> {
        instructions::handle_create_tournament(ctx, tournament_data)
    }

    pub fn register_tournament(
        ctx: Context<RegisterParticipant>,
        register_params: RegisterParams,
    ) -> Result<()> {
        instructions::handle_register_tournament(ctx, register_params)
    }

    pub fn set_bloom_precision(ctx: Context<SetBloomPrecision>, new_precision: f64) -> Result<()> {
        instructions::handle_set_bloom_precision(ctx, new_precision)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::InvalidAdmin)]
    admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + GenomeConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Account<'info, GenomeConfig>,
    system_program: Program<'info, System>,
}
