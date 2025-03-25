use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use growable_bloom_filter::GrowableBloom as Bloom;

use crate::{
    data::{BloomFilter, GenomeConfig, Tournament, TournamentData}, TournamentError, BLOOM, CONFIG, GENOME_ROOT, TOURNAMENT
};

const MAX_TEAM_SIZE: u16 = 3200;

pub fn handle_create_tournament(
    ctx: Context<CreateTournament>,
    tournament_data: TournamentData,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    validate_params(&tournament_data, &ctx.accounts.config)?;
    initialize_bloom_filter(
        &tournament_data,
        &ctx.accounts.config.false_precision,
        &mut ctx.accounts.bloom_filter,
    )?;
    let id = &mut ctx.accounts.config.tournament_nonce;
    tournament.initialize(*id, tournament_data);
    *id += 1;

    if tournament.sponsor_pool > 0 {
        let accounts = TransferChecked {
            from: ctx.accounts.sponsor_ata.to_account_info(),
            to: ctx.accounts.prize_pool_ata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, tournament.sponsor_pool, ctx.accounts.mint.decimals)?;
    }

    emit!(TournamentCreated {
        id: tournament.id,
        organizer_fee: tournament.organizer_royalty,
        sponsor_pool: tournament.sponsor_pool,
        expiration_time: tournament.expiration_time,
        entry_fee: tournament.entry_fee,
        team_size: tournament.team_size,
        min_teams: tournament.min_teams,
        max_teams: tournament.max_teams,
        asset_mint: tournament.asset_mint
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentData)]
pub struct CreateTournament<'info> {
    #[account(mut)]
    organizer: Signer<'info>,
    /// CHECKED
    sponsor: UncheckedAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(
        init,
        payer = organizer,
        space = 8 + Tournament::INIT_SPACE,
        seeds = [GENOME_ROOT, TOURNAMENT, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    tournament: Account<'info, Tournament>,
    mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = organizer,
        associated_token::mint = mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    prize_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = organizer,
        associated_token::mint = mint,
        associated_token::authority = sponsor,
        associated_token::token_program = token_program,
    )]
    sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = organizer,
        space = 8 + calculate_bloom_memory(tournament_data.max_teams * tournament_data.team_size, config.false_precision)?,
        seeds = [GENOME_ROOT, BLOOM, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    bloom_filter: Box<Account<'info, BloomFilter>>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

#[event]
pub struct TournamentCreated {
    pub id: u32,
    pub sponsor_pool: u64,
    pub organizer_fee: u64,
    pub expiration_time: u64,
    pub entry_fee: u64,
    pub team_size: u16,
    pub min_teams: u16,
    pub max_teams: u16,
    pub asset_mint: Pubkey,
}

pub fn calculate_bloom_memory(players_count: u16, false_precision: f64) -> Result<usize> {
    if players_count > MAX_TEAM_SIZE {
        return Err(TournamentError::MaxPlayersExceeded.into());
    }
    let num_slices = ((1.0_f64 / false_precision).log2()).ceil() as u64;
    let slice_len_bits = (players_count as f64 / 2f64.ln()).ceil() as u64;
    let total_bits = num_slices * slice_len_bits;
    let buffer_bytes = ((total_bits + 7) / 8) as usize;
    let memory = 8 * 9 + 4 + buffer_bytes;
    Ok(memory)
}

pub fn validate_params(params: &TournamentData, config: &GenomeConfig) -> Result<()> {
    require!(
        params.organizer_royalty <= config.max_organizer_royalty,
        TournamentError::InvalidRoyalty
    );
    require!(
        params.entry_fee >= config.min_entry_fee,
        TournamentError::InvalidAdmissionFee
    );
    require!(
        params.min_teams >= config.min_teams && params.max_teams <= config.max_teams,
        TournamentError::InvalidTeamsCount
    );
    require!(
        params.sponsor_pool >= config.min_sponsor_pool,
        TournamentError::InvalidSponsorPool
    );
    Ok(())
}

pub fn initialize_bloom_filter(
    tournament: &TournamentData,
    false_precision: &f64,
    bloom_filter: &mut Account<BloomFilter>,
) -> Result<()> {
    let items_count = tournament.max_teams * tournament.team_size;
    let bloom = Bloom::new(*false_precision, items_count as usize);
    bloom_filter.data =
        bincode::serialize(&bloom).map_err(|_| error!(TournamentError::SerializationError))?;
    Ok(())
}
