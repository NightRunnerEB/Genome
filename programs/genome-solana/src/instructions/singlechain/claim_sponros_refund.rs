use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    data::{Tournament, TournamentStatus},
    error::GenomeError,
    GENOME_ROOT, TOURNAMENT,
};

pub fn handle_claim_sponsor_funds(ctx: Context<ClaimSponsorRefund>) -> Result<()> {
    require!(ctx.accounts.reward_pool_ata.amount >= ctx.accounts.tournament.config.sponsor_pool, GenomeError::InsufficientFunds);
    
    let tournament_seeds = &[
        GENOME_ROOT,
        TOURNAMENT,
        &ctx.accounts.tournament.id.to_le_bytes(),
        &[ctx.bumps.tournament],
    ];
    let signer = &[&tournament_seeds[..]];
    
    let transfer_accounts = TransferChecked {
        from: ctx.accounts.reward_pool_ata.to_account_info(),
        to: ctx.accounts.sponsor_ata.to_account_info(),
        mint: ctx.accounts.asset_mint.to_account_info(),
        authority: ctx.accounts.tournament.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );
    transfer_checked(
        cpi_ctx,
        ctx.accounts.tournament.config.sponsor_pool,
        ctx.accounts.asset_mint.decimals,
    )?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32)]
pub struct ClaimSponsorRefund<'info> {
    #[account(
        mut,
        constraint = sponsor.key() == tournament.config.sponsor @ GenomeError::NotAllowed)
    ]
    pub sponsor: Signer<'info>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()],
        constraint = tournament.status == TournamentStatus::Canceled @ GenomeError::InvalidStatus, 
        bump)]
    pub tournament: Account<'info, Tournament>,

    #[account(constraint = asset_mint.key() == tournament.config.asset_mint @ GenomeError::InvalidNome)]
    pub asset_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = sponsor,
    )]
    pub sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament,
    )]
    pub reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    
    pub token_program: Interface<'info, TokenInterface>,
}
