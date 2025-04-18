use anchor_lang::prelude::*;

use crate::{data::GenomeSingleConfig, error::GenomeError, GENOME_ROOT, SINGLE_CONFIG};

const MIN_PRECISION: u64 = 0;
const MAX_PRECISION: u64 = 100000000;

pub(crate) fn handle_set_bloom_precision(
    ctx: Context<SetBloomPrecision>,
    new_precision: u64,
) -> Result<()> {
    require!(
        new_precision > MIN_PRECISION && new_precision <= MAX_PRECISION,
        GenomeError::InvalidPrecision
    );

    let config = &mut ctx.accounts.config;
    config.false_precision = new_precision;

    Ok(())
}

#[derive(Accounts)]
pub(crate) struct SetBloomPrecision<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,
}
