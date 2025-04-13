use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    data::{FinishMetaData, Tournament, TournamentStatus},
    error::GenomeError,
    team::Team,
    FINISH, GENOME_ROOT, TEAM, TOURNAMENT,
};

pub fn handle_claim_reward(
    ctx: Context<ClaimReward>,
    tournament_id: u32,
    captain: Pubkey,
) -> Result<()> {
    require!(ctx.accounts.finish_meta_data.captain_winner == captain, GenomeError::NotWinner);

    let tournament = &ctx.accounts.tournament;
    let team = &mut ctx.accounts.team;
    let finish_meta_data = &ctx.accounts.finish_meta_data;

    let participant = ctx.accounts.participant.key();
    team.reward_participant(&participant)?;

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
    transfer_checked(cpi, finish_meta_data.reward, ctx.accounts.asset_mint.decimals)?;

    emit!(RewardClaimed {
        tournament_id,
        participant,
        amount: finish_meta_data.reward
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32, captain: Pubkey)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()],
        constraint = tournament.status == TournamentStatus::Finished @ GenomeError::InvalidStatus,
        bump,
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TEAM, tournament_id.to_le_bytes().as_ref(), captain.as_ref()],
        bump,
    )]
    pub team: Account<'info, Team>,

    #[account(constraint = asset_mint.key() == tournament.config.asset_mint @ GenomeError::InvalidNome)]
    asset_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, FINISH, tournament_id.to_le_bytes().as_ref()],
        bump
    )]
    pub finish_meta_data: Account<'info, FinishMetaData>,

    #[account(
        mut,
        associated_token::mint = tournament.config.asset_mint,
        associated_token::authority = participant,
    )]
    pub participant_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = tournament.config.asset_mint,
        associated_token::authority = tournament,
    )]
    pub reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct RewardClaimed {
    pub tournament_id: u32,
    pub participant: Pubkey,
    pub amount: u64,
}
