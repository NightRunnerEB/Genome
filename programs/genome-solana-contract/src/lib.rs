#![allow(unexpected_cfgs)]

mod data;
mod error;

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, pubkey::PUBKEY_BYTES, system_instruction},
};

use data::{GenomeConfig, Role, RoleInfo};
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
        if role == Role::Verifier {
            let config = &mut ctx.accounts.config;

            if config.verifier_addresses.len() >= config.verifier_addresses.capacity() {
                let current_capacity = config.verifier_addresses.capacity();
                let new_capacity = current_capacity + 1;

                let new_size = GenomeConfig::DISCRIMINATOR.len()
                    + GenomeConfig::INIT_SPACE
                    + (new_capacity * PUBKEY_BYTES);
                realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_size)?;
            }
            config.verifier_addresses.push(ctx.accounts.user.key());
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
        init,
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
    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, user.key().as_ref()],
        bump,
        close = admin
    )]
    role_info: Account<'info, RoleInfo>,
}
