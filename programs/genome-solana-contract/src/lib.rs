#![allow(unexpected_cfgs)]

mod data;
mod error;

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, pubkey::PUBKEY_BYTES, system_instruction},
};

use anchor_spl::token_interface::Mint;
use data::{GenomeConfig, Role, RoleInfo, TokenInfo};
use error::TournamentError;

declare_id!("61k9jndWDe36Wb7X1vteVLiWjmwFGwDmFLzzvLKtUPZo");

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("HCoTZ78773EUD6EjAgAdAD9mNF3sEDbsW9KGAvUPGEU7");

#[constant]
const GENOME_ROOT: &[u8] = b"genome";
#[constant]
const CONFIG: &[u8] = b"config";
#[constant]
const ROLE: &[u8] = b"role";
#[constant]
const TOKEN: &[u8] = b"token";

#[program]
mod genome_contract {
    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeConfig) -> Result<()> {
        if !config_params.verifier_addresses.is_empty() {
            return Err(TournamentError::InvalidParams.into());
        }
        ctx.accounts.config.set_inner(config_params);
        Ok(())
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        require!(!ctx.accounts.role_info.roles.contains(&role), TournamentError::RoleAlreadyGranted,);

        if role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let current_len = config.verifier_addresses.len();
            let new_len = current_len + 1;
            let new_space = GenomeConfig::DISCRIMINATOR.len() + GenomeConfig::INIT_SPACE + (new_len * PUBKEY_BYTES);

            realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_space)?;
            config.verifier_addresses.push(ctx.accounts.user.key());
        }

        ctx.accounts.role_info.roles.push(role);

        Ok(())
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
        let index = ctx.accounts.role_info.roles.iter().position(|r| *r == role).ok_or(TournamentError::RoleNotFound)?;

        if role == Role::Verifier {
            let config = &mut ctx.accounts.config;
            let user_key = ctx.accounts.user.key();
            let current_len = config.verifier_addresses.len();
            let new_len = current_len - 1;
            let new_space = GenomeConfig::DISCRIMINATOR.len() + GenomeConfig::INIT_SPACE + (new_len * PUBKEY_BYTES);

            realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_space)?;
            if let Some(indx) = config.verifier_addresses.iter().position(|&k| k == user_key) {
                config.verifier_addresses.remove(indx);
            }
        }
        ctx.accounts.role_info.roles.remove(index);

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
}

fn realloc<'info>(account: AccountInfo<'info>, payer: AccountInfo<'info>, space: usize) -> Result<()> {
    let rent_lamports = Rent::get()?.minimum_balance(space);
    let current_lamports = account.lamports();
    account.realloc(space, false)?;

    if rent_lamports > current_lamports {
        system_transfer(payer, account, rent_lamports - current_lamports)?;
    } else {
        account.sub_lamports(current_lamports - rent_lamports)?;
        payer.add_lamports(current_lamports - rent_lamports)?;
    }

    Ok(())
}

fn system_transfer<'a>(from: AccountInfo<'a>, to: AccountInfo<'a>, amount: u64) -> Result<()> {
    let ix = system_instruction::transfer(from.key, to.key, amount);
    invoke(&ix, &[from.clone(), to.clone()])?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(config_params: GenomeConfig)]
struct Initialize<'info> {
    #[account(mut, address = DEPLOYER @ TournamentError::NotAllowed)]
    deployer: Signer<'info>,
    #[account(
        init,
        payer = deployer,
        space = GenomeConfig::DISCRIMINATOR.len() + GenomeConfig::INIT_SPACE,
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
    user: SystemAccount<'info>,
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
    user: SystemAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(mut, seeds = [GENOME_ROOT, ROLE, user.key().as_ref()], bump)]
    role_info: Account<'info, RoleInfo>,
}

#[derive(Accounts)]
pub struct ApproveToken<'info> {
    #[account(mut)]
    operator: Signer<'info>,
    asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Operator) @ TournamentError::NotAllowed
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
pub struct BanToken<'info> {
    #[account(mut)]
    operator: Signer<'info>,
    asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Operator) @ TournamentError::NotAllowed
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
