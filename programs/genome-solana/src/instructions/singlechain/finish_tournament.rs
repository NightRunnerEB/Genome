use std::collections::HashMap;

use crate::{
    data::{
        Consensus, FinishMetaData, GenomeSingleConfig, RoleInfo, RoleList, Tournament,
        TournamentStatus,
    },
    error::GenomeError,
    Role, CONSENSUS, FINISH, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOURNAMENT,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handle_finish_tournament(
    ctx: Context<FinishTournament>,
    tournament_id: u32,
    captain_winner: Pubkey,
) -> Result<()> {
    let config = &ctx.accounts.config;
    let role_info = &mut ctx.accounts.role_info;
    let consensus = &mut ctx.accounts.consensus;
    let tournament = &mut ctx.accounts.tournament;
    let finish_meta = &mut ctx.accounts.finish_meta_data;
    let verifier_list = &ctx.accounts.verifier_list.accounts;
    let verifier_pk = ctx.accounts.verifier.key();

    let verifier_index =
        verifier_list.iter().position(|&v| v == verifier_pk).expect("verifier not found");

    require!((consensus.finish_votes >> verifier_index) & 1 == 0, GenomeError::AlreadyVoted);

    consensus.finish_votes |= 1 << verifier_index;
    finish_meta.finish_votes.push(captain_winner);
    role_info.claim += config.verifier_fee;

    let votes = consensus.finish_votes.count_ones() as u64;
    let total = verifier_list.len() as u64;

    if votes * 10000 >= total * config.consensus_rate {
        let mut counts = HashMap::new();
        for pk in finish_meta.finish_votes.iter() {
            *counts.entry(pk).or_insert(0) += 1;
        }
        let winner = *counts
            .into_iter()
            .max_by_key(|&(_, count)| count)
            .map(|(pk, _)| pk)
            .expect("List of captains can't be empty");

        let tournament_seeds = &[
            GENOME_ROOT,
            TOURNAMENT,
            &tournament.id.to_le_bytes(),
            &[ctx.bumps.tournament],
        ];
        let signer = &[&tournament_seeds[..]];

        let reward_pool = tournament.config.sponsor_pool
            + tournament.config.entry_fee * tournament.team_count as u64;
        let organizer_reward =
            (reward_pool as f64 * (tournament.config.organizer_fee as f64 / 10000f64)) as u64;
        let reward_per_winner =
            (reward_pool - organizer_reward) / tournament.config.team_size as u64;

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

        finish_meta.captain_winner = winner;
        finish_meta.reward = reward_per_winner;

        tournament.status = TournamentStatus::Finished;
        emit!(TournamentFinished {
            tournament_id,
            winner
        });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32)]
pub struct FinishTournament<'info> {
    pub verifier: Signer<'info>,

    pub organizer: SystemAccount<'info>,

    #[account(
        seeds = [GENOME_ROOT, ROLE, verifier.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Verifier) @ GenomeError::NotAllowed
    )]
    pub role_info: Account<'info, RoleInfo>,

    #[account(seeds = [GENOME_ROOT, ROLE, Role::Verifier.to_seed()], bump)]
    pub verifier_list: Account<'info, RoleList>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,

    #[account(mut, seeds = [GENOME_ROOT, CONSENSUS, tournament_id.to_le_bytes().as_ref()], bump)]
    pub consensus: Account<'info, Consensus>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()],
        constraint = tournament.status == TournamentStatus::Started @ GenomeError::InvalidStatus,
        bump
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(mut, seeds = [GENOME_ROOT, FINISH, tournament_id.to_le_bytes().as_ref()], bump)]
    pub finish_meta_data: Account<'info, FinishMetaData>,

    #[account(constraint = asset_mint.key() == tournament.config.asset_mint @ GenomeError::InvalidNome)]
    pub asset_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = organizer,
    )]
    pub organizer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament,
    )]
    pub reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct TournamentFinished {
    pub tournament_id: u32,
    pub winner: Pubkey,
}
