#[allow(unexpected_cfgs)]

mod state;
mod error;
mod utils;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::TransferChecked,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface},
};

use state::{Tournament, TournamentCreated, GenomeConfig, TournamentData, BloomFilterAccount};
use utils::{calculate_bloom_memory, validate_params};

declare_id!("4pVeqak3JdGUoNqSiVcuft1tQ5AzHcBKP7VZabxBjejF");

#[cfg(feature = "localnet")]
const DEPLOYER: &str = "4JBz7FTeRHcVgMx8qU4pUWbgqsZPp48eM8uV1tZXRjG7";

const GENOME_ROOT: &[u8] = b"genome";
const CONFIG: &[u8] = b"config";
const BLOOM: &[u8] = b"bloom";
const TOURNAMENT: &[u8] = b"tournament";

#[program]
pub mod genome_contract {
    use crate::utils::initialize_bloom_filter;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config: GenomeConfig) -> Result<()> {
        ctx.accounts.config.set_inner(config);
        Ok(())
    }

    pub fn create_tournament(
        ctx: Context<CreateTournamentSinglechain>,
        tournament_data: TournamentData,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        validate_params(&tournament_data, &ctx.accounts.config)?;
        initialize_bloom_filter(tournament, &mut ctx.accounts.bloom_filter)?;
        let id = &mut ctx.accounts.config.tournament_nonce;
        tournament.initialize(id, tournament_data);

        let accounts = TransferChecked {
            from: ctx.accounts.sponsor_ata.to_account_info(),
            to: ctx.accounts.sponsor_pool_ata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info()
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, tournament.sponsor_pool, ctx.accounts.mint.decimals)?;

        emit!(TournamentCreated {
            tournament_id: tournament.key(),
            organizer_wallet: tournament.organizer_wallet,
            sponsor_wallet: tournament.sponsor_wallet,
            sponsor_pool: tournament.sponsor_pool,
            entry_fee: tournament.entry_fee,
            registration_start: tournament.registration_start,
            participant_per_team: tournament.participant_per_team,
            min_teams: tournament.min_teams,
            max_teams: tournament.max_teams,
            token: tournament.token
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        mut,
        signer,
        address = DEPLOYER.parse::<Pubkey>().expect("")
    )]
    admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = GenomeConfig::get_account_size(),
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Box<Account<'info, GenomeConfig>>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentData)]
pub struct CreateTournamentSinglechain<'info> {
    #[account(
        mut,
        signer
    )]
    pub organizer: Signer<'info>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, CONFIG],
        bump,
    )]
    pub config: Account<'info, GenomeConfig>,
    #[account(
        init,
        payer = organizer,
        space = Tournament::get_account_size(),
        seeds = [GENOME_ROOT, TOURNAMENT, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub tournament: Box<Account<'info, Tournament>>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = organizer,
        associated_token::mint = mint, 
            associated_token::authority = organizer,
        associated_token::token_program = token_program,
    )]
    pub sponsor_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = organizer,
        associated_token::mint = mint, 
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    pub sponsor_pool_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init, 
        payer = organizer, 
        space = 8 + calculate_bloom_memory(tournament_data.max_teams * tournament_data.participant_per_team)?,
        seeds = [GENOME_ROOT, BLOOM],
        bump
    )]
    pub bloom_filter: Account<'info, BloomFilterAccount>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}
