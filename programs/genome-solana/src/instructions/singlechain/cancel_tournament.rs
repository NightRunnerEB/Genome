use crate::{
    data::{Consensus, GenomeSingleConfig, RoleInfo, RoleList, Tournament, TournamentStatus},
    error::GenomeError,
    Role, CONSENSUS, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOURNAMENT,
};
use anchor_lang::prelude::*;

pub fn handle_cancel_tournament(ctx: Context<CancelTournament>, tournament_id: u32) -> Result<()> {
    let config = &ctx.accounts.config;
    let role_info_ver = &mut ctx.accounts.role_info_ver;
    let consensus = &mut ctx.accounts.consensus;
    let tournament = &mut ctx.accounts.tournament;
    let verifier_pk = ctx.accounts.verifier.key();

    let verifier_index = ctx
        .accounts
        .verifier_list
        .accounts
        .iter()
        .position(|&v| v == verifier_pk)
        .expect("verifier not found");

    require!((consensus.cancel_votes >> verifier_index) & 1 == 0, GenomeError::AlreadyVoted);

    consensus.cancel_votes |= 1 << verifier_index;
    role_info_ver.claim += config.verifier_fee;

    let votes = consensus.cancel_votes.count_ones() as u64;
    let total = ctx.accounts.verifier_list.accounts.len() as u64;

    if votes * 10000 >= total * config.consensus_rate {
        ctx.accounts.role_info_org.claim += config.platform_fee;
        tournament.status = TournamentStatus::Canceled;
        emit!(TournamentCanceled { tournament_id });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32)]
pub struct CancelTournament<'info> {
    pub verifier: Signer<'info>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, verifier.key().as_ref()],
        bump,
        constraint = role_info_ver.roles.contains(&Role::Verifier) @ GenomeError::NotAllowed,
    )]
    pub role_info_ver: Account<'info, RoleInfo>,

    #[account(
        seeds = [GENOME_ROOT, ROLE, Role::Verifier.to_seed()],
        bump
    )]
    pub verifier_list: Account<'info, RoleList>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,

    #[account(mut, seeds = [GENOME_ROOT, CONSENSUS, tournament_id.to_le_bytes().as_ref()], bump)]
    pub consensus: Account<'info, Consensus>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()],
        constraint = tournament.status == TournamentStatus::New @ GenomeError::InvalidStatus,
        bump
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, tournament.organizer.as_ref()],
        bump,
        constraint = role_info_org.roles.contains(&Role::Organizer) @ GenomeError::NotAllowed,
    )]
    pub role_info_org: Account<'info, RoleInfo>,
}

#[event]
pub struct TournamentCanceled {
    pub tournament_id: u32,
}
