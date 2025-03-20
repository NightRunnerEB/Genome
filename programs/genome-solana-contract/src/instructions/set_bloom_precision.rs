use crate::{data::GenomeConfig, TournamentError, CONFIG, DEPLOYER, GENOME_ROOT};
use anchor_lang::prelude::*;

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
        new_precision > 0.0 && new_precision < 1.0,
        TournamentError::InvalidPrecision
    );

    let config = &mut ctx.accounts.config;
    config.false_precision = new_precision;

    Ok(())
}
