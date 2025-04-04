use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, pubkey::PUBKEY_BYTES, system_instruction},
};

use crate::{
    data::{GenomeSingleConfig, Role, RoleInfo},
    error::GenomeError,
    GENOME_ROOT, ROLE, SINGLE_CONFIG,
};

pub fn handle_grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
    require!(!ctx.accounts.role_info.roles.contains(&role), GenomeError::RoleAlreadyGranted,);

    if role == Role::Verifier {
        let config = &mut ctx.accounts.config;
        let current_len = config.verifier_addresses.len();
        let new_len = current_len + 1;
        let new_space = GenomeSingleConfig::DISCRIMINATOR.len()
            + GenomeSingleConfig::INIT_SPACE
            + (new_len * PUBKEY_BYTES);

        realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_space)?;
        config.verifier_addresses.push(ctx.accounts.user.key());
    }

    ctx.accounts.role_info.roles.push(role);

    Ok(())
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
pub struct GrantRole<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    admin: Signer<'info>,
    user: SystemAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    config: Box<Account<'info, GenomeSingleConfig>>,
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
