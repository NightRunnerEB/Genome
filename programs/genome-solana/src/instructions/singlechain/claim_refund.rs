use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    data::{Tournament, TournamentStatus},
    error::GenomeError,
    team::Team,
    GENOME_ROOT, TEAM, TOURNAMENT,
};

pub fn handle_claim_refund(
    ctx: Context<ClaimRefund>,
    tournament_id: u32,
    _captain: Pubkey,
) -> Result<()> {
    let tournament = &ctx.accounts.tournament;
    let team = &mut ctx.accounts.team;

    if tournament.status == TournamentStatus::New
        || (tournament.status != TournamentStatus::Canceled && team.completed)
    {
        return Err(GenomeError::InvalidStatus.into());
    }

    let participant = ctx.accounts.participant.key();
    let count = team.refund_participant(&participant)?;

    let amount_to_refund = tournament.config.entry_fee * count as u64;

    let tournament_seeds = &[
        GENOME_ROOT,
        TOURNAMENT,
        &tournament.id.to_le_bytes(),
        &[ctx.bumps.tournament],
    ];
    let signer = &[&tournament_seeds[..]];

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.reward_pool_ata.to_account_info(),
        to: ctx.accounts.participant_ata.to_account_info(),
        mint: ctx.accounts.asset_mint.to_account_info(),
        authority: ctx.accounts.tournament.to_account_info(),
    };
    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );
    transfer_checked(cpi, amount_to_refund, ctx.accounts.asset_mint.decimals)?;

    emit!(RefundClaimed {
        tournament_id,
        participant: participant,
        amount: amount_to_refund,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32, captain: Pubkey)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TEAM, tournament_id.to_le_bytes().as_ref(), captain.as_ref()],
        bump
    )]
    pub team: Account<'info, Team>,

    #[account(constraint = asset_mint.key() == tournament.config.asset_mint @ GenomeError::InvalidNome)]
    pub asset_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = participant,
    )]
    pub participant_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament
    )]
    pub reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct RefundClaimed {
    pub tournament_id: u32,
    pub participant: Pubkey,
    pub amount: u64,
}
