use crate::{data::GenomeConfig, TournamentError, CONFIG, DEPLOYER, GENOME_ROOT};
use anchor_lang::prelude::*;

const MIN_PRECISION: f64 = 0.0;
const MAX_PRECISION: f64 = 1.0;

#[derive(Accounts)]
pub struct SetBloomPrecision<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::InvalidAdmin)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    pub config: Account<'info, GenomeConfig>,
}

pub fn handle_set_bloom_precision(
    ctx: Context<SetBloomPrecision>,
    new_precision: f64,
) -> Result<()> {
    require!(
        new_precision > MIN_PRECISION && new_precision < MAX_PRECISION,
        TournamentError::InvalidPrecision
    );

    let config = &mut ctx.accounts.config;
    config.false_precision = new_precision;

    Ok(())
}