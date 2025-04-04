use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::GenomeError;

pub fn handle_revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
    let index = ctx
        .accounts
        .role_info
        .roles
        .iter()
        .position(|r| *r == role)
        .ok_or(GenomeError::RoleNotFound)?;

    if role == Role::Verifier {
        let config = &mut ctx.accounts.config;
        let user_key = ctx.accounts.user.key();
        let current_len = config.verifier_addresses.len();
        let new_len = current_len - 1;
        let new_space =
            GenomeConfig::DISCRIMINATOR.len() + GenomeConfig::INIT_SPACE + (new_len * PUBKEY_BYTES);

        realloc(config.to_account_info(), ctx.accounts.admin.to_account_info(), new_space)?;
        if let Some(indx) = config.verifier_addresses.iter().position(|&k| k == user_key) {
            config.verifier_addresses.remove(indx);
        }
    }
    ctx.accounts.role_info.roles.remove(index);

    Ok(())
}

#[derive(Accounts)]
struct RevokeRole<'info> {
    #[account(mut, address = config.admin @ GenomeError::NotAllowed)]
    admin: Signer<'info>,
    user: SystemAccount<'info>,
    #[account(mut, seeds = [GENOME_ROOT, CONFIG], bump)]
    config: Account<'info, GenomeConfig>,
    #[account(mut, seeds = [GENOME_ROOT, ROLE, user.key().as_ref()], bump)]
    role_info: Account<'info, RoleInfo>,
}
