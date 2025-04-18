use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    data::RoleInfo, error::GenomeError, GenomeSingleConfig, GENOME_ROOT, PLATFORM, ROLE,
    SINGLE_CONFIG,
};

pub fn handle_claim_role_fund(ctx: Context<ClaimRoleFund>, amount: u64) -> Result<()> {
    require!(ctx.accounts.role_info.claim >= amount, GenomeError::InsufficientFunds);
    ctx.accounts.role_info.claim -= amount;

    let platform_seeds = &[GENOME_ROOT, PLATFORM, &[ctx.bumps.platform_wallet]];
    let signer = &[&platform_seeds[..]];

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.platform_ata.to_account_info(),
        to: ctx.accounts.claimer_ata.to_account_info(),
        mint: ctx.accounts.nome_mint.to_account_info(),
        authority: ctx.accounts.platform_wallet.to_account_info(),
    };

    msg!("platform_ata: {}", ctx.accounts.platform_ata.amount);
    msg!("platform_wallet: {}", ctx.accounts.platform_wallet.lamports());

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );

    transfer_checked(cpi, amount, ctx.accounts.nome_mint.decimals)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimRoleFund<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// CHECKED
    #[account(mut, seeds = [GENOME_ROOT, PLATFORM], bump)]
    pub platform_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, claimer.key().as_ref()],
        constraint = !role_info.roles.is_empty() @ GenomeError::NotAllowed,
        bump
    )]
    pub role_info: Account<'info, RoleInfo>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,

    #[account(constraint = nome_mint.key() == config.nome_mint @ GenomeError::InvalidNome)]
    pub nome_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = claimer,
    )]
    pub claimer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = platform_wallet,
    )]
    pub platform_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}
