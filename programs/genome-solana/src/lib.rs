#![allow(unexpected_cfgs)]

mod data;
mod error;
mod instructions;
mod team;
mod utils;

use instructions::*;

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, pubkey::PUBKEY_BYTES, system_instruction},
};

use data::{BloomFilter, GenomeConfig, Role, RoleInfo, TokenInfo, Tournament, TournamentConfig};
use error::GenomeError;


declare_id!("9SK6NkuZHbPHYqL2qpcN5gwpfnjtPLj36mLn6PGfe3R8");

#[constant]
const GENOME_ROOT: &[u8] = b"genome-0";
#[constant]
const OMNI_CONFIG_SEED: &[u8] = b"omni-config";

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("ESUEU5vr1FJxBBC4qaHviseqcr8hzZsoTjji1o947Yzy");

#[program]
mod genome_solana {
    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        if !config_params.verifier_addresses.is_empty() {
            return Err(TournamentError::InvalidGenomeConfig.into());
        }
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        instructions::grant_role::handle_grant_role(ctx, role)?;
        Ok(())
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
        instructions::revoke_role::handle_revoke_role(ctx, role)?;
        Ok(())
    }

    #[instruction(discriminator = b"aprvtokn")]
    pub fn approve_token(
        ctx: Context<ApproveToken>,
        min_sponsor_pool: u64,
        min_entry_fee: u64,
    ) -> Result<()> {
        instructions::approve_token::handle_approve_token(
            ctx,
            min_sponsor_pool,
            min_entry_fee,
        )?;
        Ok(())
    }

    #[instruction(discriminator = b"bantokn")]
    pub fn ban_token(ctx: Context<BanToken>) -> Result<()> {
        instructions::ban_token::handle_ban_token(ctx)?;
        Ok(())
    }

    #[instruction(discriminator = b"crtntmnt")]
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_config: TournamentConfig,
    ) -> Result<()> {
        instructions::create_tournament::handle_create_tournament(
            ctx,
            tournament_config,
        )?;
        Ok(())
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

#[derive(Accounts)]
#[instruction(config_params: GenomeSingleConfig)]
struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::NotAllowed)]
    deployer: Signer<'info>,
    #[account(
        init,
        payer = deployer,
        space = GenomeSingleConfig::DISCRIMINATOR.len() + GenomeSingleConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Account<'info, GenomeSingleConfig>,
    system_program: Program<'info, System>,
}
