#![allow(unexpected_cfgs)]

mod data;
mod error;
mod utils;

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, pubkey::PUBKEY_BYTES, system_instruction},
};

use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use data::{
    BloomFilter, GenomeConfig, Role, RoleInfo, TokenInfo, Tournament, TournamentCreated,
    TournamentData,
};
use error::TournamentError;
use utils::calculate_bloom_memory;

declare_id!("5HoKH9fr5wrQU3MyKBJuhpFx18QT3fXWYruSyDYD2UJR");

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("HCoTZ78773EUD6EjAgAdAD9mNF3sEDbsW9KGAvUPGEU7");

#[constant]
const GENOME_ROOT: &[u8] = b"genome";
#[constant]
const CONFIG: &[u8] = b"config";
#[constant]
const BLOOM: &[u8] = b"bloom";
#[constant]
const TOURNAMENT: &[u8] = b"tournament";
#[constant]
const ROLE: &[u8] = b"role";
#[constant]
const TOKEN: &[u8] = b"token";

#[program]
mod genome_contract {
    use anchor_spl::token::{transfer_checked, TransferChecked};

    use crate::utils::{initialize_bloom_filter, validate_params};

    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        if role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let verifier_to_add = ctx.accounts.user.key();

            if config.verifier_addresses.len() >= config.verifier_addresses.capacity() {
                let current_capacity = config.verifier_addresses.capacity();
                let new_capacity = current_capacity + 1;

                let new_size = 8 + GenomeConfig::INIT_SPACE + (new_capacity * 32);
                realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_size)?;
            }
            config.verifier_addresses.push(verifier_to_add);
        }
        ctx.accounts.role_info.role = role;

        Ok(())
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>) -> Result<()> {
        if ctx.accounts.role_info.role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let verifier = ctx.accounts.user.key();
            if let Some(index) = config.verifier_addresses.iter().position(|&key| key == verifier) {
                config.verifier_addresses.remove(index);
            }
        }
        Ok(())
    }

    #[instruction(discriminator = b"aprvtokn")]
    pub fn approve_token(
        ctx: Context<ApproveToken>,
        min_sponsor_pool: u64,
        min_entry_fee: u64,
    ) -> Result<()> {
        let info = &mut ctx.accounts.token_info;
        info.asset_mint = ctx.accounts.asset_mint.key();
        info.min_sponsor_pool = min_sponsor_pool;
        info.min_entry_fee = min_entry_fee;

        Ok(())
    }

    #[instruction(discriminator = b"bantokn")]
    pub fn ban_token(_ctx: Context<BanToken>) -> Result<()> {
        Ok(())
    }

    #[instruction(discriminator = b"crtntmnt")]
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_data: TournamentData,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        validate_params(&tournament_data, &ctx.accounts.config, &ctx.accounts.token_info)?;
        initialize_bloom_filter(
            tournament,
            &ctx.accounts.config.false_precision,
            &mut ctx.accounts.bloom_filter,
        )?;
        let id = &mut ctx.accounts.config.tournament_nonce;
        tournament.initialize(*id, tournament_data.clone());
        *id += 1;

        if tournament.tournament_data.sponsor_pool > 0 {
            let accounts = TransferChecked {
                from: ctx.accounts.sponsor_ata.to_account_info(),
                to: ctx.accounts.prize_pool_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.organizer.to_account_info(),
            };

            let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
            transfer_checked(
                cpi,
                tournament.tournament_data.sponsor_pool,
                ctx.accounts.mint.decimals,
            )?;
        }

        emit!(TournamentCreated {
            id: tournament.id,
            tournament_data: tournament_data
        });

        Ok(())
    }
}

fn realloc<'info>(
    account: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    space: usize,
) -> Result<()> {
    let rent_lamports = Rent::get()?.minimum_balance(space);
    let current_lamports = account.lamports();
    account.realloc(space, false)?;
    if rent_lamports > current_lamports {
        system_transfer(payer, account, rent_lamports - current_lamports)?;
    }
    Ok(())
}

fn system_transfer<'a>(from: AccountInfo<'a>, to: AccountInfo<'a>, amount: u64) -> Result<()> {
    let ix = system_instruction::transfer(from.key, to.key, amount);
    invoke(&ix, &[from.clone(), to.clone()]).map_err(|err| {
        msg!("Transfer failed: {:?}", err);
        err.into()
    })
}

#[derive(Accounts)]
#[instruction(config_params: GenomeConfig)]
struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::NotAllowed)]
    deployer: Signer<'info>,
    #[account(
        init,
        payer = deployer,
        space = GenomeConfig::DISCRIMINATOR.len() + GenomeConfig::INIT_SPACE + config_params.verifier_addresses.len() * PUBKEY_BYTES,
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Account<'info, GenomeConfig>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
struct GrantRole<'info> {
    #[account(signer, mut, address = config.admin @ TournamentError::NotAllowed)]
    admin: Signer<'info>,
    /// CHECK:
    user: AccountInfo<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Box<Account<'info, GenomeConfig>>,
    #[account(
        init_if_needed,
        payer = admin,
        space = RoleInfo::DISCRIMINATOR.len() + RoleInfo::INIT_SPACE,
        seeds = [GENOME_ROOT, ROLE, user.key().as_ref()],
        bump
    )]
    role_info: Box<Account<'info, RoleInfo>>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
struct RevokeRole<'info> {
    #[account(mut, signer, address = config.admin @ TournamentError::NotAllowed)]
    admin: Signer<'info>,
    /// CHECK:
    user: AccountInfo<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, user.key().as_ref()],
        bump,
        close = admin
    )]
    role_info: Account<'info, RoleInfo>,
}

#[derive(Accounts)]
struct ApproveToken<'info> {
    #[account(mut)]
    operator: Signer<'info>,
    /// CHECKED
    pub asset_mint: AccountInfo<'info>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.role == Role::Operator @ TournamentError::NotAllowed
    )]
    role_info: Account<'info, RoleInfo>,
    #[account(
        init_if_needed,
        payer = operator,
        space = TokenInfo::DISCRIMINATOR.len() + TokenInfo::INIT_SPACE,
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump
    )]
    token_info: Account<'info, TokenInfo>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
struct BanToken<'info> {
    #[account(mut)]
    operator: Signer<'info>,
    /// CHECKED
    asset_mint: AccountInfo<'info>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.role == Role::Operator @ TournamentError::NotAllowed
    )]
    role_info: Account<'info, RoleInfo>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump,
        close = operator
    )]
    token_info: Account<'info, TokenInfo>,
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentData)]
struct CreateTournament<'info> {
    #[account(mut)]
    organizer: Signer<'info>,
    /// CHECKED
    sponsor: UncheckedAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, organizer.key().as_ref()],
        bump,
        constraint = role_info.role == Role::Organizer @ TournamentError::NotAllowed
    )]
    role_info: Account<'info, RoleInfo>,
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
        seeds = [GENOME_ROOT, TOKEN, mint.key().as_ref()],
        bump,
    )]
    token_info: Account<'info, TokenInfo>,
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
