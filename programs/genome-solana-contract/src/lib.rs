#![allow(unexpected_cfgs)]

mod data;
mod error;
mod utils;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::TransferChecked,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface},
};
use error::TournamentError;

use crate::{
    data::{BloomFilterAccount, GenomeConfig, Tournament, TournamentCreated, TournamentData},
    utils::{calculate_bloom_memory, initialize_bloom_filter, validate_params},
};

declare_id!("7cE2qCGyTDS5WgL35sf626utKRfeWKjLZ7KrXspbgN1n");

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("ADMimZiEmRJczgEvYqGQXoMsYJd2vXpeqJxyGDJh5J4");

const GENOME_ROOT: &[u8] = b"genome";
const CONFIG: &[u8] = b"config";
const BLOOM: &[u8] = b"bloom";
const TOURNAMENT: &[u8] = b"tournament";

#[program]
pub mod genome_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    pub fn create_tournament(
        ctx: Context<CreateTournamentSinglechain>,
        tournament_data: TournamentData,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        validate_params(&tournament_data, &ctx.accounts.config)?;
        initialize_bloom_filter(
            tournament,
            &ctx.accounts.config.false_precision,
            &mut ctx.accounts.bloom_filter,
        )?;
        let id = &mut ctx.accounts.config.tournament_nonce;
        tournament.initialize(*id, tournament_data);
        *id += 1;

        let accounts = TransferChecked {
            from: ctx.accounts.sponsor_ata.to_account_info(),
            to: ctx.accounts.prize_pool_ata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, tournament.sponsor_pool, ctx.accounts.mint.decimals)?;

        emit!(TournamentCreated {
            id: tournament.id,
            organizer: tournament.organizer,
            organizer_royalty: tournament.organizer_royalty,
            sponsor: tournament.sponsor,
            sponsor_pool: tournament.sponsor_pool,
            entry_fee: tournament.entry_fee,
            team_size: tournament.team_size,
            min_teams: tournament.min_teams,
            max_teams: tournament.max_teams,
            token: tournament.token
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::InvalidAdmin)]
    admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + GenomeConfig::INIT_SPACE,
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Account<'info, GenomeConfig>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentData)]
pub struct CreateTournamentSinglechain<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    /// CHECKED
    pub sponsor: UncheckedAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    pub config: Account<'info, GenomeConfig>,
    #[account(
        init,
        payer = organizer,
        space = 8 + Tournament::INIT_SPACE,
        seeds = [GENOME_ROOT, TOURNAMENT, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = organizer,
        associated_token::mint = mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    pub prize_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = sponsor,
        associated_token::token_program = token_program,
    )]
    pub sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = organizer,
        space = 8 + calculate_bloom_memory(tournament_data.max_teams * tournament_data.team_size, config.false_precision)?,
        seeds = [GENOME_ROOT, BLOOM, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub bloom_filter: Box<Account<'info, BloomFilterAccount>>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}
