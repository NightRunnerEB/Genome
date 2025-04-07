use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    data::{
        BloomFilter, GenomeSingleConfig, Role, RoleInfo, TokenInfo, Tournament, TournamentConfig,
        TournamentCreated,
    },
    error::GenomeError,
    utils::{calculate_bloom_memory, initialize_bloom_filter, validate_params},
    BLOOM, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOKEN, TOURNAMENT,
};

pub fn handle_create_tournament(
    ctx: Context<CreateTournament>,
    tournament_config: TournamentConfig,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    validate_params(&tournament_config, &ctx.accounts.config, &ctx.accounts.token_info)?;
    initialize_bloom_filter(
        &tournament_config,
        &ctx.accounts.config.false_precision,
        &mut ctx.accounts.bloom_filter,
    )?;
    let id = &mut ctx.accounts.config.tournament_nonce;
    tournament.initialize(*id, tournament_config.clone());
    *id += 1;

    if tournament.config.sponsor_pool > 0 {
        let accounts = TransferChecked {
            from: ctx.accounts.sponsor_ata.to_account_info(),
            to: ctx.accounts.prize_pool_ata.to_account_info(),
            mint: ctx.accounts.asset_mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, tournament.config.sponsor_pool, ctx.accounts.asset_mint.decimals)?;
    }

    let accounts = TransferChecked {
        from: ctx.accounts.organizer_ata.to_account_info(),
        to: ctx.accounts.platform_pool_ata.to_account_info(),
        mint: ctx.accounts.nome_mint.to_account_info(),
        authority: ctx.accounts.organizer.to_account_info(),
    };

    let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
    transfer_checked(cpi, ctx.accounts.config.platform_fee, ctx.accounts.nome_mint.decimals)?;

    emit!(TournamentCreated {
        id: tournament.id,
        config: tournament_config
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentConfig)]
pub struct CreateTournament<'info> {
    #[account(mut)]
    organizer: Signer<'info>,
    sponsor: SystemAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    pub config: Account<'info, GenomeSingleConfig>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, organizer.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Organizer) @ GenomeError::NotAllowed
    )]
    role_info: Account<'info, RoleInfo>,
    #[account(
        init,
        payer = organizer,
        space = Tournament::DISCRIMINATOR.len() + Tournament::INIT_SPACE,
        seeds = [GENOME_ROOT, TOURNAMENT, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    tournament: Account<'info, Tournament>,
    asset_mint: InterfaceAccount<'info, Mint>,
    #[account(constraint = nome_mint.key() == config.nome_mint @ GenomeError::InvalidNome)]
    nome_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump,
    )]
    token_info: Account<'info, TokenInfo>,
    #[account(
        init,
        payer = organizer,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    prize_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = organizer,
        associated_token::mint = asset_mint,
        associated_token::authority = sponsor,
        associated_token::token_program = token_program,
    )]
    sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = organizer,
        associated_token::token_program = token_program,
    )]
    organizer_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = config.platform_wallet,
        associated_token::token_program = token_program,
    )]
    platform_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = organizer,
        space = BloomFilter::DISCRIMINATOR.len() + calculate_bloom_memory(tournament_data.max_teams * tournament_data.team_size, config.false_precision)?,
        seeds = [GENOME_ROOT, BLOOM, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    bloom_filter: Box<Account<'info, BloomFilter>>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}
