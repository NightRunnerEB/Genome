#![allow(unexpected_cfgs)]

mod data;
mod error;
mod instructions;
mod team;
mod utils;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("9SK6NkuZHbPHYqL2qpcN5gwpfnjtPLj36mLn6PGfe3R8");

#[constant]
const GENOME_ROOT: &[u8] = b"genome-0";
#[constant]
const OMNI_CONFIG_SEED: &[u8] = b"omni-config";

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("ESUEU5vr1FJxBBC4qaHviseqcr8hzZsoTjji1o947Yzy");

#[error_code]
enum CustomError {
    #[msg("Signer is not allowed")]
    NotAllowed,
}

#[program]
mod genome_solana {
    use super::*;

    

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
        ctx.accounts.omni_config.set_inner(omni_config);
        Ok(())
    }

    #[instruction(discriminator = b"bridgefe")]
    pub fn set_bridge_fee(ctx: Context<SetBridgeFee>, bridge_fee: u64) -> Result<()> {
        ctx.accounts.omni_config.bridge_fee = bridge_fee;
        Ok(())
    }
}

#[derive(Accounts)]
struct InitializeOmni<'info> {
    #[account(mut, address = DEPLOYER @ CustomError::NotAllowed)]
    deployer: Signer<'info>,

    #[account(
        init,
        payer = deployer,
        space = GenomeOmniConfig::DISCRIMINATOR.len() + GenomeOmniConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, OMNI_CONFIG_SEED],
        bump
    )]
    omni_config: Box<Account<'info, GenomeOmniConfig>>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
struct SetBridgeFee<'info> {
    #[account(mut, address = omni_config.admin @ CustomError::NotAllowed)]
    admin: Signer<'info>,

    #[account(mut, seeds = [GENOME_ROOT, OMNI_CONFIG_SEED], bump)]
    omni_config: Box<Account<'info, GenomeOmniConfig>>,

    system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
struct GenomeOmniConfig {
    admin: Pubkey,
    uts_program: Pubkey,
    bridge_fee: u64,
    genome_chain_id: u64,
}
