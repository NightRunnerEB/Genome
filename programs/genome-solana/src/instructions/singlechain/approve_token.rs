use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{
    data::{Role, RoleInfo, TokenInfo},
    error::GenomeError,
    GENOME_ROOT, ROLE, TOKEN,
};

pub(crate) fn handle_approve_token(
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

#[derive(Accounts)]
pub(crate) struct ApproveToken<'info> {
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
        init_if_needed,
        payer = operator,
        space = TokenInfo::DISCRIMINATOR.len() + TokenInfo::INIT_SPACE,
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump
    )]
    token_info: Account<'info, TokenInfo>,
    
    system_program: Program<'info, System>,
}
