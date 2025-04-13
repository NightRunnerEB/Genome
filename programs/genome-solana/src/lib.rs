#![allow(unexpected_cfgs)]

mod data;
mod error;
mod instructions;
mod team;
mod utils;

use instructions::*;

use anchor_lang::prelude::*;

use data::{GenomeOmniConfig, GenomeSingleConfig, Role, TournamentConfig};

declare_id!("572G4eB1NNusfqGj3DVTZw1ZooweLBiaA3ko7fLhSsV2");

#[constant]
const GENOME_ROOT: &[u8] = b"genome-0";
#[constant]
const OMNI_CONFIG: &[u8] = b"omni-config";
#[constant]
const SINGLE_CONFIG: &[u8] = b"single-config";
#[constant]
const BLOOM: &[u8] = b"bloom";
#[constant]
const TOURNAMENT: &[u8] = b"tournament";
#[constant]
const TEAM: &[u8] = b"team";
#[constant]
const ROLE: &[u8] = b"role";
#[constant]
const TOKEN: &[u8] = b"token";
#[constant]
const CONSENSUS: &[u8] = b"consensus";
#[constant]
const FINISH: &[u8] = b"finish";
#[constant]
const PLATFORM: &[u8] = b"platform";

#[cfg(feature = "localnet")]
const DEPLOYER: Pubkey = pubkey!("CB39FqtnDdACX9XkwjsA2gYGd7ZfxjveMewhxRoB9c8k");

#[program]
mod genome_solana {
    use super::*;

    #[instruction(discriminator = b"initsngl")]
    pub fn initialize(ctx: Context<Initialize>, config_params: GenomeSingleConfig) -> Result<()> {
        handle_initialize_single(ctx, config_params)
    }

    #[instruction(discriminator = b"grntrole")]
    pub fn grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
        handle_grant_role(ctx, role)
    }

    #[instruction(discriminator = b"revkrole")]
    pub fn revoke_role(ctx: Context<RevokeRole>, role: Role) -> Result<()> {
        handle_revoke_role(ctx, role)
    }

    #[instruction(discriminator = b"aprvtokn")]
    pub fn approve_token(
        ctx: Context<ApproveToken>,
        min_sponsor_pool: u64,
        min_entry_fee: u64,
    ) -> Result<()> {
        handle_approve_token(ctx, min_sponsor_pool, min_entry_fee)
    }

    #[instruction(discriminator = b"bantokn")]
    pub fn ban_token(ctx: Context<BanToken>) -> Result<()> {
        handle_ban_token(ctx)
    }

    #[instruction(discriminator = b"crtntmnt")]
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_config: TournamentConfig,
    ) -> Result<()> {
        handle_create_tournament(ctx, tournament_config)
    }

    #[instruction(discriminator = b"regtmnt")]
    pub fn register_tournament(
        ctx: Context<RegisterParticipant>,
        register_params: RegisterParams,
    ) -> Result<()> {
        handle_register_tournament(ctx, register_params)
    }

    #[instruction(discriminator = b"bloomprc")]
    pub fn set_bloom_precision(ctx: Context<SetBloomPrecision>, new_precision: f64) -> Result<()> {
        handle_set_bloom_precision(ctx, new_precision)
    }

    #[instruction(discriminator = b"strttmnt")]
    pub fn start_tournament(ctx: Context<StartTournament>, tournament_id: u32) -> Result<()> {
        handle_start_tournament(ctx, tournament_id)
    }

    #[instruction(discriminator = b"cncltmnt")]
    pub fn cancel_tournament(ctx: Context<CancelTournament>, tournament_id: u32) -> Result<()> {
        handle_cancel_tournament(ctx, tournament_id)
    }

    #[instruction(discriminator = b"fnshtmnt")]
    pub fn finish_tournament(
        ctx: Context<FinishTournament>,
        tournament_id: u32,
        winner: Pubkey,
    ) -> Result<()> {
        handle_finish_tournament(ctx, tournament_id, winner)
    }

    #[instruction(discriminator = b"clmrewrd")]
    pub fn claim_reward(ctx: Context<ClaimReward>, tournament_id: u32, captain: Pubkey) -> Result<()> {
        handle_claim_reward(ctx, tournament_id, captain)
    }

    #[instruction(discriminator = b"clmrlfnd")]
    pub fn claim_role_fund(ctx: Context<ClaimRoleFund>, amount: u64) -> Result<()> {
        handle_claim_role_fund(ctx, amount)
    }

    #[instruction(discriminator = b"clmspfnd")]
    pub fn claim_sponsor_refund(ctx: Context<ClaimSponsorRefund>) -> Result<()> {
        handle_claim_sponsor_funds(ctx)
    }

    #[instruction(discriminator = b"clmrefnd")]
    pub fn claim_refund(ctx: Context<ClaimRefund>, tournament_id: u32, captain: Pubkey) -> Result<()> {
        handle_claim_refund(ctx, tournament_id, captain)
    }

    #[instruction(discriminator = b"withdraw")]
    pub fn withdraw(ctx: Context<WithdrawPlatformFee>, amount: u64) -> Result<()> {
        handle_withdraw(ctx, amount)
    }

    //
    //
    //  OMNICHAIN INSTRUCTIONS
    //
    //
    //

    #[instruction(discriminator = b"initomni")]
    pub fn initialize_omni(
        ctx: Context<InitializeOmni>,
        omni_config: GenomeOmniConfig,
    ) -> Result<()> {
        handle_initialize_omni(ctx, omni_config)
    }

    #[instruction(discriminator = b"bridgefe")]
    pub fn set_bridge_fee(ctx: Context<SetBridgeFee>, bridge_fee: u64) -> Result<()> {
        handle_set_bridge_fee(ctx, bridge_fee)
    }
}
