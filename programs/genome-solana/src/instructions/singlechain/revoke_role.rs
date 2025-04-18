use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::{
    data::{GenomeSingleConfig, Role, RoleInfo, RoleList},
    error::GenomeError,
    realloc, GENOME_ROOT, ROLE, SINGLE_CONFIG,
};

pub(crate) fn handle_revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
    let user_key = ctx.accounts.user.key();
    let role_list = &mut ctx.accounts.role_list;

    let index_role_info = ctx
        .accounts
        .role_info
        .roles
        .iter()
        .position(|r| *r == role)
        .ok_or(GenomeError::RoleNotFound)?;

    let index_role_list =
        role_list.accounts.iter().position(|user| *user == user_key).expect("User must have role");

    let current_count = role_list.accounts.len();
    let new_count = current_count - 1;
    let new_space =
        RoleList::DISCRIMINATOR.len() + RoleList::INIT_SPACE + (new_count * PUBKEY_BYTES);

    realloc(role_list.to_account_info(), ctx.accounts.admin.to_account_info(), new_space)?;

    role_list.accounts.remove(index_role_list);
    ctx.accounts.role_info.roles.remove(index_role_info);

    Ok(())
}

#[derive(Accounts)]
#[instruction(role: Role)]
pub(crate) struct RevokeRole<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    admin: Signer<'info>,

    user: SystemAccount<'info>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    config: Account<'info, GenomeSingleConfig>,

    #[account(mut, seeds = [GENOME_ROOT, ROLE, user.key().as_ref()], bump)]
    role_info: Account<'info, RoleInfo>,

    #[account(
        mut,
        seeds = [GENOME_ROOT, ROLE, role.to_seed()],
        bump
    )]
    role_list: Box<Account<'info, RoleList>>,
}
