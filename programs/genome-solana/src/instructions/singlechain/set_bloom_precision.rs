use anchor_lang::prelude::*;
use crate::{data::GenomeSingleConfig, GenomeError, GENOME_ROOT};

pub fn handle_set_bloom_precision(
    ctx: Context<SetBloomPrecision>,
    new_precision: f64,
) -> Result<()> {
    require!(new_precision > 0f64 && new_precision <= 100f64, GenomeError::InvalidPrecision);

    let config = &mut ctx.accounts.config;
    config.false_precision = new_precision;

    Ok(())
}

#[derive(Accounts)]
pub struct SetBloomPrecision<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, b"CONFIG"], bump)]
    pub config: Account<'info, GenomeSingleConfig>,
}