use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{data::GenomeSingleConfig, error::GenomeError, GENOME_ROOT, PLATFORM, SINGLE_CONFIG};

pub fn handle_withdraw(ctx: Context<WithdrawPlatformFee>, amount: u64) -> Result<()> {
    require!(ctx.accounts.platform_ata.amount >= amount, GenomeError::InsufficientFunds);

    let platform_seeds = &[GENOME_ROOT, PLATFORM, &[ctx.bumps.platform_wallet]];
    let signer = &[&platform_seeds[..]];

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.platform_ata.to_account_info(),
        to: ctx.accounts.admin_ata.to_account_info(),
        mint: ctx.accounts.nome_mint.to_account_info(),
        authority: ctx.accounts.platform_wallet.to_account_info(),
    };

    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );

    transfer_checked(cpi, amount, ctx.accounts.nome_mint.decimals)?;

    emit!(PlatformFeeWithdrawn {
        amount,
        admin: ctx.accounts.admin.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawPlatformFee<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,

    /// CHECKED
    #[account(
        seeds = [GENOME_ROOT, PLATFORM],
        bump,
    )]
    pub platform_wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = platform_wallet,
    )]
    pub platform_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = admin,
    )]
    pub admin_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub nome_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct PlatformFeeWithdrawn {
    pub amount: u64,
    pub admin: Pubkey,
}
