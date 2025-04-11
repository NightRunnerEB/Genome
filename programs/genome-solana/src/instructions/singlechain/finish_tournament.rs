use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::{
    data::{Consensus, FinishMetaData, GenomeSingleConfig, RoleInfo, Tournament, TournamentStatus}, 
    error::GenomeError, 
    Role, CONSENSUS, FINISH, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOURNAMENT
};

pub fn handle_finish_tournament(ctx: Context<FinishTournament>, tournament_id: u32, captain_winners: Vec<Pubkey>) -> Result<()> {
    let config = &ctx.accounts.config;
    let consensus = &mut ctx.accounts.consensus;
    let tournament = &mut ctx.accounts.tournament;
    let finish_meta_data = &mut ctx.accounts.finish_meta_data;

    let verifier_key = ctx.accounts.verifier.key();
    let verifier_index = config
        .verifier_addresses
        .iter()
        .position(|&v| v == verifier_key)
        .expect("verifier not found");

    require!((consensus.finish_votes >> verifier_index) & 1 == 0, GenomeError::AlreadyVoted);

    consensus.finish_votes |= 1 << verifier_index;

    let votes = consensus.finish_votes.count_ones();
    let total = config.verifier_addresses.len();
    let ratio = (votes as f64 / total as f64) * 100.0;

    if ratio >= config.consensus_rate {
        let tournament_seeds = &[
            GENOME_ROOT,
            TOURNAMENT,
            &tournament.id.to_le_bytes(),
            &[ctx.bumps.tournament],
        ];
        let signer = &[&tournament_seeds[..]];

        let reward_pool = tournament.config.sponsor_pool + tournament.config.entry_fee * tournament.team_count as u64;
        let organizer_reward = (reward_pool as f64 * tournament.config.organizer_fee as f64 / 100.0) as u64;
        let reward_per_winner = (reward_pool - organizer_reward) / (captain_winners.len() * tournament.config.team_size as usize) as u64;

        let accounts = TransferChecked {
            from: ctx.accounts.reward_pool_ata.to_account_info(),
            to: ctx.accounts.organizer_ata.to_account_info(),
            mint: ctx.accounts.asset_mint.to_account_info(),
            authority: tournament.to_account_info(),
        };
        let cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            accounts,
            signer,
        );
        transfer_checked(cpi, organizer_reward, ctx.accounts.asset_mint.decimals)?;

        finish_meta_data.captain_winners = captain_winners;
        finish_meta_data.tournament_id = tournament_id;
        finish_meta_data.reward = reward_per_winner;

        tournament.status = TournamentStatus::Finished;
        emit!(TournamentFinished { tournament_id });
    }

    // НУЖНО ЛИ ДЕЛАТЬ ПРОВЕРКУ winners.len() != 0?

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32)]
pub(crate) struct FinishTournament<'info> {
    #[account(mut)]
    verifier: Signer<'info>,

    organizer: SystemAccount<'info>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, ROLE, verifier.key().as_ref()],
        constraint = role_info.roles.contains(&Role::Verifier) @ GenomeError::NotAllowed,
        bump,
    )]
    role_info: Account<'info, RoleInfo>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    config: Account<'info, GenomeSingleConfig>,

    #[account(mut, seeds = [GENOME_ROOT, CONSENSUS, tournament_id.to_le_bytes().as_ref()], bump)]
    consensus: Account<'info, Consensus>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()], 
        constraint = tournament.status == TournamentStatus::Started @ GenomeError::InvalidStatus,
        bump
    )]
    tournament: Account<'info, Tournament>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, FINISH, tournament_id.to_le_bytes().as_ref()], 
        bump
    )]
    finish_meta_data: Account<'info, FinishMetaData>,

    #[account(constraint = asset_mint.key() == tournament.config.asset_mint @ GenomeError::InvalidNome)]
    asset_mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = organizer,
    )]
    organizer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament,
    )]
    reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct TournamentFinished {
    pub tournament_id: u32,
}
