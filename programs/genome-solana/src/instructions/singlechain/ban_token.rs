use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{
    data::{Role, RoleInfo, TokenInfo},
    error::GenomeError,
    GENOME_ROOT, ROLE, TOKEN,
};

pub fn handle_ban_token(_ctx: Context<BanToken>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct BanToken<'info> {
    #[account(mut)]
    operator: Signer<'info>,
    asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [GENOME_ROOT, ROLE, operator.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Operator) @ GenomeError::NotAllowed
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
