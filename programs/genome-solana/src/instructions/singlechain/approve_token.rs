use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    data::{BloomFilter, GenomeConfig, Tournament, TournamentData},
    utils::{calculate_bloom_memory, initialize_bloom_filter, validate_params},
};

pub fn handle_approve_token(
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
struct ApproveToken<'info> {
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
