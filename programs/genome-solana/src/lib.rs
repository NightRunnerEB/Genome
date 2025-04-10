#![allow(unexpected_cfgs)]

mod data;
mod error;
mod instructions;

use instructions::*;

use anchor_lang::prelude::*;

use data::{GenomeOmniConfig, GenomeSingleConfig, Role};

declare_id!("5hBmrTE8HhSad8rhYcHMff7dKm4HyB1nij1FjGrm2Y6b");

#[constant]
const GENOME_ROOT: &[u8] = b"genome-0";
#[constant]
const OMNI_CONFIG: &[u8] = b"omni-config";
#[constant]
const SINGLE_CONFIG: &[u8] = b"single-config";
#[constant]
const ROLE: &[u8] = b"role";
#[constant]
const PLATFORM: &[u8] = b"platform";

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("ESUEU5vr1FJxBBC4qaHviseqcr8hzZsoTjji1o947Yzy");

#[program]
mod genome_solana {
    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeSingleConfig) -> Result<()> {
        handle_initialize_single(ctx, config_params)
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        handle_grant_role(ctx, role)
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
        handle_revoke_role(ctx, role)
    }

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
        handle_initialize_omni(ctx, omni_config)
    }

    #[instruction(discriminator = b"bridgefe")]
    pub fn set_bridge_fee(ctx: Context<SetBridgeFee>, bridge_fee: u64) -> Result<()> {
        handle_set_bridge_fee(ctx, bridge_fee)
    }
}
