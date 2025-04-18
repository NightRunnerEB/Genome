use anchor_lang::prelude::*;

use crate::{data::GenomeOmniConfig, error::GenomeError, DEPLOYER, GENOME_ROOT, OMNI_CONFIG};

pub(crate) fn handle_initialize_omni(
    ctx: Context<InitializeOmni>,
    omni_config: GenomeOmniConfig,
) -> Result<()> {
    ctx.accounts.omni_config.set_inner(omni_config);
    Ok(())
}

#[derive(Accounts)]
pub(crate) struct InitializeOmni<'info> {
    #[account(mut, address = DEPLOYER @ GenomeError::NotAllowed)]
    deployer: Signer<'info>,

    #[account(
        init,
        payer = deployer,
        space = GenomeOmniConfig::DISCRIMINATOR.len() + GenomeOmniConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, OMNI_CONFIG],
        bump
    )]
    omni_config: Box<Account<'info, GenomeOmniConfig>>,

    system_program: Program<'info, System>,
}
