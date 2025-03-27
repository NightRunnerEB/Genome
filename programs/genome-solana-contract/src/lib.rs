#![allow(unexpected_cfgs)]

mod data;
mod error;

use std::mem;

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction},
};

use data::{GenomeConfig, Role, RoleInfo, TokenInfo};
use error::TournamentError;

declare_id!("G4nqiWUsV9ho8CTBT1SQE5CHQTcAhpy4viPip95MziLk");

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("HCoTZ78773EUD6EjAgAdAD9mNF3sEDbsW9KGAvUPGEU7");

const GENOME_ROOT: &[u8] = b"genome";
const CONFIG: &[u8] = b"config";
const ROLE: &[u8] = b"role";
const TOKEN: &[u8] = b"token";

#[program]
mod genome_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        if role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let verifier_to_add = ctx.accounts.user.key();

            if config.verifier_addresses.len() >= config.verifier_addresses.capacity() {
                let current_capacity = config.verifier_addresses.capacity();
                let new_capacity = current_capacity + 1;

                let new_size = 8 + GenomeConfig::INIT_SPACE + (new_capacity * 32);
                realloc(
                    config.to_account_info(),
                    ctx.accounts.admin.to_account_info(),
                    new_size,
                    true,
                )?;
            }
            config.verifier_addresses.push(verifier_to_add);
        }
        ctx.accounts.role_info.role = role;

        Ok(())
    }

    pub fn revoke_role(ctx: Context<RevokeRole>) -> Result<()> {
        if ctx.accounts.role_info.role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let verifier = ctx.accounts.user.key();
            if let Some(index) = config
                .verifier_addresses
                .iter()
                .position(|&key| key == verifier)
            {
                config.verifier_addresses.remove(index);
            }
        }
        Ok(())
    }

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

    pub fn ban_token(_ctx: Context<BanToken>) -> Result<()> {
        Ok(())
    }
}

fn realloc<'info>(
    account: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    space: usize,
    claim_extra_lamports: bool,
) -> Result<()> {
    let rent_lamports = Rent::get()?.minimum_balance(space);
    let current_lamports = account.lamports();
    account.realloc(space, false)?;
    if rent_lamports > current_lamports {
        system_transfer(payer, account, rent_lamports - current_lamports)?;
    } else if claim_extra_lamports {
        account.sub_lamports(current_lamports - rent_lamports)?;
        payer.add_lamports(current_lamports - rent_lamports)?;
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
pub struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::InvalidAdmin)]
    deployer: Signer<'info>,
    #[account(
        init,
        payer = deployer,
        space = 8 + GenomeConfig::INIT_SPACE + config_params.verifier_addresses.len() * mem ::size_of::<Pubkey>(),
        seeds = [GENOME_ROOT, CONFIG],
        bump
    )]
    config: Account<'info, GenomeConfig>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantRole<'info> {
    #[account(signer, mut, address = config.admin @ TournamentError::InvalidAdmin )]
    pub admin: Signer<'info>,
    /// CHECK:
    pub user: AccountInfo<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    pub config: Box<Account<'info, GenomeConfig>>,
    #[account(
        init_if_needed,
        payer = admin, 
        space = 8 + RoleInfo::INIT_SPACE,
        seeds = [GENOME_ROOT, ROLE, user.key().as_ref()], bump
    )]
    pub role_info: Box<Account<'info, RoleInfo>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeRole<'info> {
    #[account(mut, signer, address = config.admin @ TournamentError::InvalidAdmin)]
    pub admin: Signer<'info>,
    /// CHECK:
    pub user: AccountInfo<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    pub config: Account<'info, GenomeConfig>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, user.key().as_ref()],
        bump,
        close = admin
    )]
    pub role_info: Account<'info, RoleInfo>,
}

#[derive(Accounts)]
pub struct ApproveToken<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    /// CHECKED
    pub asset_mint: AccountInfo<'info>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.role == Role::Operator @ TournamentError::InvalidRole
    )]
    pub role_info: Account<'info, RoleInfo>,
    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + TokenInfo::INIT_SPACE,
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump
    )]
    pub token_info: Account<'info, TokenInfo>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BanToken<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    /// CHECKED
    pub asset_mint: AccountInfo<'info>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.role == Role::Operator @ TournamentError::InvalidRole
    )]
    pub role_info: Account<'info, RoleInfo>,
    #[account(
        mut,
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump,
        close = operator
    )]
    pub token_info: Account<'info, TokenInfo>,
}
