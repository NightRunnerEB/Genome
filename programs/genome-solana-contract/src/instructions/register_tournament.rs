use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::TransferChecked,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface},
};
use growable_bloom_filter::GrowableBloom as Bloom;

use crate::{
    data::{BloomFilter, GenomeConfig, Tournament, TournamentStatus},
    error::TournamentError,
    team::Team,
    BLOOM, CONFIG, GENOME_ROOT, TEAM, TOURNAMENT,
};

pub fn handle_register_tournament(
    ctx: Context<RegisterParticipantToTournamentSinglechain>,
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
        bincode::deserialize(&bloom_filter.data).expect("Error deserialize GrowableBloom");

    if !register_params.teammates.is_empty() {
        check_and_transfer(
            &mut bloom,
            tournament,
            register_params.participant,
            ctx.accounts.payer_ata.to_account_info(),
            ctx.accounts.reward_pool_ata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.participant.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.decimals,
        )?;

        **team = Team::new(register_params.participant, tournament.team_size);
        tournament.team_count += 1;
        team.add_participant_by_captain(register_params.participant)?;

        for teammate in register_params.teammates {
            check_and_transfer(
                &mut bloom,
                tournament,
                teammate,
                ctx.accounts.payer_ata.to_account_info(),
                ctx.accounts.reward_pool_ata.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.participant.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.mint.decimals,
            )?;
            team.add_participant_by_captain(teammate)?;
        }
    } else {
        check_and_transfer(
            &mut bloom,
            tournament,
            register_params.participant,
            ctx.accounts.payer_ata.to_account_info(),
            ctx.accounts.reward_pool_ata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.participant.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.mint.decimals,
        )?;
        team.add_participant(register_params.participant)?;
    }

    bloom_filter.data = bincode::serialize(&bloom).expect("msg");
    Ok(())
}

fn check_and_transfer<'info>(
    bloom: &mut Bloom,
    tournament: &mut Tournament,
    participant: Pubkey,
    payer_ata: AccountInfo<'info>,
    reward_pool_ata: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    decimals: u8,
) -> Result<()> {
    if !bloom.insert(&participant) {
        return Err(TournamentError::AlreadyRegistered.into());
    }

    let cpi_ctx = CpiContext::new(
        token_program.clone(),
        TransferChecked {
            from: payer_ata,
            to: reward_pool_ata,
            mint,
            authority: payer,
        },
    );
    transfer_checked(cpi_ctx, tournament.entry_fee, decimals)?;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(register_params: RegisterParams)]
pub struct RegisterParticipantToTournamentSinglechain<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    pub config: Account<'info, GenomeConfig>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, TOURNAMENT, register_params.tournament_id.to_le_bytes().as_ref()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    #[account(
        init_if_needed,
        payer = participant,
        space = 8 + Team::INIT_SPACE + (32 + 2 + 1)*tournament.team_size as usize,
        seeds = [GENOME_ROOT, TEAM, register_params.tournament_id.to_le_bytes().as_ref(), register_params.captain.as_ref()],
        bump
    )]
    pub team: Account<'info, Team>,
    #[account(address = tournament.asset_mint @ TournamentError::InvalidToken)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = participant,
        associated_token::token_program = token_program,
    )]
    pub payer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    pub reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, seeds = [GENOME_ROOT, BLOOM, register_params.tournament_id.to_le_bytes().as_ref()], bump)]
    pub bloom_filter: Box<Account<'info, BloomFilter>>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterParams {
    pub tournament_id: u32,
    pub participant: Pubkey,
    pub captain: Pubkey,
    pub teammates: Vec<Pubkey>,
}

#[derive(Debug)]
#[event]
pub struct ParticipantRegistered {
    pub participant: Pubkey,
    pub captain: Pubkey,
}
