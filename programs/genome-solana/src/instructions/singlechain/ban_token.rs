use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    data::{BloomFilter, GenomeConfig, Tournament, TournamentData},
    utils::{calculate_bloom_memory, initialize_bloom_filter, validate_params},
};

pub fn handle_ban_token(_ctx: Context<BanToken>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
struct BanToken<'info> {
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
