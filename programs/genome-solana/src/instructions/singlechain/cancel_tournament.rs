use anchor_lang::prelude::*;

use crate::{
    data::{Consensus, GenomeSingleConfig, RoleInfo, Tournament, TournamentStatus}, 
    error::GenomeError, Role, 
    CONSENSUS, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOURNAMENT
};

pub fn handle_cancel_tournament(ctx: Context<CancelTournament>, tournament_id: u32) -> Result<()> {
    let config = &ctx.accounts.config;
    let consensus = &mut ctx.accounts.consensus;
    let tournament = &mut ctx.accounts.tournament;

    let verifier_key = ctx.accounts.verifier.key();
    let verifier_index = config
        .verifier_addresses
        .iter()
        .position(|&v| v == verifier_key)
        .expect("verifier not found");

    require!((consensus.cancel_votes >> verifier_index) & 1 == 0, GenomeError::AlreadyVoted);

    consensus.cancel_votes |= 1 << verifier_index;

    let votes = consensus.cancel_votes.count_ones();
    let total = config.verifier_addresses.len();
    let ratio = (votes as f64 / total as f64) * 100.0;

    if ratio >= config.consensus_rate {
        let role_info_org = &mut ctx.accounts.role_info_org;
        role_info_org.claim += config.platform_fee;
        tournament.status = TournamentStatus::Canceled;
        emit!(TournamentCanceled { tournament_id });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_id: u32)]
pub struct CancelTournament<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, ROLE, verifier.key().as_ref()],
        constraint = role_info_ver.roles.contains(&Role::Verifier) @ GenomeError::NotAllowed,
        bump,
    )]
    pub role_info_ver: Account<'info, RoleInfo>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,

    #[account(mut, seeds = [GENOME_ROOT, CONSENSUS, tournament_id.to_le_bytes().as_ref()], bump)]
    pub consensus: Account<'info, Consensus>,

    #[account(
        mut, 
        seeds = [GENOME_ROOT, TOURNAMENT, tournament_id.to_le_bytes().as_ref()], 
        constraint = tournament.status == TournamentStatus::New || tournament.status == TournamentStatus::Started @ GenomeError::InvalidStatus,
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, tournament.organizer.as_ref()],
        constraint = role_info_org.roles.contains(&Role::Organizer) @ GenomeError::NotAllowed,
        bump,
    )]
    pub role_info_org: Account<'info, RoleInfo>,
}

#[event]
pub struct TournamentCanceled {
    pub tournament_id: u32,
}
