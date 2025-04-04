use anchor_lang::prelude::*;

use crate::{data::GenomeSingleConfig, error::GenomeError, DEPLOYER, GENOME_ROOT, SINGLE_CONFIG};

pub fn handle_initialize_single(
    ctx: Context<Initialize>,
    config_params: GenomeSingleConfig,
) -> Result<()> {
    if !config_params.verifier_addresses.is_empty() {
        return Err(GenomeError::InvalidGenomeConfig.into());
    }
    ctx.accounts.config.set_inner(config_params);
    Ok(())
}

#[derive(Accounts)]
#[instruction(config_params: GenomeSingleConfig)]
pub struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ GenomeError::NotAllowed)]
    deployer: Signer<'info>,
    #[account(
        init,
        payer = deployer,
        space = GenomeSingleConfig::DISCRIMINATOR.len() + GenomeSingleConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, SINGLE_CONFIG],
        bump
    )]
    config: Account<'info, GenomeSingleConfig>,
    system_program: Program<'info, System>,
}
