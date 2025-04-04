use anchor_lang::prelude::*;

use crate::{data::GenomeOmniConfig, error::GenomeError, GENOME_ROOT, OMNI_CONFIG_SEED};

pub fn handle_set_bridge_fee(ctx: Context<SetBridgeFee>, bridge_fee: u64) -> Result<()> {
    ctx.accounts.omni_config.bridge_fee = bridge_fee;
    Ok(())
}

#[derive(Accounts)]
pub struct SetBridgeFee<'info> {
    #[account(mut, address = omni_config.admin @ GenomeError::NotAllowed)]
    admin: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, OMNI_CONFIG_SEED], bump)]
    omni_config: Box<Account<'info, GenomeOmniConfig>>,
    system_program: Program<'info, System>,
}
