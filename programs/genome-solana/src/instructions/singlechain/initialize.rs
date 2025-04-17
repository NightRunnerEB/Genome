use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{
    data::GenomeSingleConfig, error::GenomeError, DEPLOYER, GENOME_ROOT, PLATFORM, SINGLE_CONFIG,
};

pub(crate) fn handle_initialize_single(
    ctx: Context<Initialize>,
    config_params: GenomeSingleConfig,
) -> Result<()> {
    require!(config_params.verifier_addresses.is_empty(), GenomeError::InvalidConfig);
    ctx.accounts.config.set_inner(config_params);
    ctx.accounts.config.platform_wallet = ctx.accounts.platform_wallet.key();
    Ok(())
}

#[derive(Accounts)]
#[instruction(config_params: GenomeSingleConfig)]
pub(crate) struct Initialize<'info> {
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

    /// CHECK: must be a valid platform wallet to allow future income withdrawals   
    #[account(seeds = [GENOME_ROOT, PLATFORM], bump)]
    platform_wallet: UncheckedAccount<'info>,

    #[account(
        init,payer = deployer, 
        associated_token::mint = nome_mint, 
        associated_token::authority = platform_wallet
    )]
    platform_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    nome_mint: InterfaceAccount<'info, Mint>,
    token_program: Interface<'info, TokenInterface>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
}
