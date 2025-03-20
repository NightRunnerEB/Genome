use anchor_lang::prelude::*;
use crate::{data::GenomeConfig, TournamentError, DEPLOYER, GENOME_ROOT};

#[derive(Accounts)]
pub struct SetBloomPrecision<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::InvalidAdmin)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, b"CONFIG"], bump)]
    pub config: Account<'info, GenomeConfig>,
}

pub fn handle_set_bloom_precision(
    ctx: Context<SetBloomPrecision>,
    new_precision: u64,
) -> Result<()> {
    require!(new_precision > 0 && new_precision < 1_000_000_000, TournamentError::InvalidPrecision);

    let config = &mut ctx.accounts.config;
    config.false_precision = new_precision;

    Ok(())
}
