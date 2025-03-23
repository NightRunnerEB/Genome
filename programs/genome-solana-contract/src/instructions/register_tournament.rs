use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use growable_bloom_filter::GrowableBloom as Bloom;

use crate::{
    data::{BloomFilter, GenomeConfig, Tournament, TournamentStatus, ParticipantInfo, Team},
    error::TournamentError,
    BLOOM, CONFIG, GENOME_ROOT, TEAM, TOURNAMENT,
};

pub fn handle_register_tournament(
    ctx: Context<RegisterParticipant>,
    register_params: RegisterParams,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    require!(
        tournament.status == TournamentStatus::New,
        TournamentError::InvalidStatus
    );
    let team = &mut ctx.accounts.team;
    let bloom_filter = &mut ctx.accounts.bloom_filter;
    let mut bloom: Bloom =
        bincode::deserialize(&bloom_filter.data).expect("Error deserialize Bloom");

    bloom_check(&register_params, &mut bloom)?;

    if !register_params.teammates.is_empty() {
        **team = Team::new(register_params.participant, tournament.team_size);
        tournament.team_count += 1;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.participant_ata.to_account_info(),
                to: ctx.accounts.reward_pool_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.participant.to_account_info(),
            },
        );

        let mut all_participants = vec![register_params.participant];
        all_participants.extend(register_params.teammates);

        transfer_checked(
            cpi_ctx,
            all_participants.len() as u64 * tournament.entry_fee,
            ctx.accounts.mint.decimals,
        )?;
        team.add_participants_by_captain(all_participants)?;
    } else {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.participant_ata.to_account_info(),
                to: ctx.accounts.reward_pool_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.participant.to_account_info(),
            },
        );
        transfer_checked(cpi_ctx, tournament.entry_fee, ctx.accounts.mint.decimals)?;

        team.add_participant(register_params.participant)?;
    }

    bloom_filter.data = bincode::serialize(&bloom).expect("Error serialize Bloom");
    Ok(())
}

fn bloom_check(register_params: &RegisterParams, bloom: &mut Bloom) -> Result<()> {
    require!(bloom.insert(register_params.participant), TournamentError::AlreadyRegistered);

    for teammate in &register_params.teammates {
        require!(bloom.insert(teammate), TournamentError::AlreadyRegistered);
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(register_params: RegisterParams)]
pub struct RegisterParticipant<'info> {
    #[account(mut)]
    participant: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, register_params.tournament_id.to_le_bytes().as_ref()],
        bump
    )]
    tournament: Account<'info, Tournament>,
    #[account(
        init_if_needed,
        payer = participant,
        space = 8 + Team::INIT_SPACE + ParticipantInfo::INIT_SPACE * tournament.team_size as usize,
        seeds = [GENOME_ROOT, TEAM, register_params.tournament_id.to_le_bytes().as_ref(), register_params.captain.as_ref()],
        bump
    )]
    team: Account<'info, Team>,
    #[account(address = tournament.asset_mint @ TournamentError::InvalidToken)]
    mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = participant,
        associated_token::token_program = token_program,
    )]
    participant_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, seeds = [GENOME_ROOT, BLOOM, register_params.tournament_id.to_le_bytes().as_ref()], bump)]
    bloom_filter: Box<Account<'info, BloomFilter>>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterParams {
    tournament_id: u32,
    participant: Pubkey,
    captain: Pubkey,
    teammates: Vec<Pubkey>,
}

#[derive(Debug)]
#[event]
pub struct ParticipantRegistered {
    participant: Pubkey,
    captain: Pubkey,
}
