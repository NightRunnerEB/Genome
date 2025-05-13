use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{
    data::{
        BloomFilter, Consensus, FinishMetaData, GenomeSingleConfig, Role, RoleInfo, RoleList,
        TokenInfo, Tournament, TournamentConfig,
    },
    error::GenomeError,
    utils::{calculate_bloom_memory, initialize_bloom_filter, validate_params},
    BLOOM, CONSENSUS, FINISH, GENOME_ROOT, ROLE, SINGLE_CONFIG, TOKEN, TOURNAMENT,
};

pub(crate) fn handle_create_tournament(
    ctx: Context<CreateTournament>,
    tournament_config: TournamentConfig,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    validate_params(&tournament_config, &ctx.accounts.config, &ctx.accounts.token_info)?;
    initialize_bloom_filter(
        &tournament_config,
        &ctx.accounts.config.false_precision,
        &mut ctx.accounts.bloom_filter,
    )?;
    let id = &mut ctx.accounts.config.tournament_nonce;
    tournament.initialize(*id, ctx.accounts.organizer.key(), tournament_config.clone());
    *id += 1;

    if tournament.config.sponsor_pool > 0 {
        let accounts = TransferChecked {
            from: ctx.accounts.sponsor_ata.to_account_info(),
            to: ctx.accounts.reward_pool_ata.to_account_info(),
            mint: ctx.accounts.asset_mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, tournament.config.sponsor_pool, ctx.accounts.asset_mint.decimals)?;
    }

    if ctx.accounts.role_info.claim >= ctx.accounts.config.platform_fee {
        ctx.accounts.role_info.claim -= ctx.accounts.config.platform_fee;
    } else {
        let accounts = TransferChecked {
            from: ctx.accounts.organizer_ata.to_account_info(),
            to: ctx.accounts.platform_ata.to_account_info(),
            mint: ctx.accounts.nome_mint.to_account_info(),
            authority: ctx.accounts.organizer.to_account_info(),
        };

        let cpi = CpiContext::new(ctx.accounts.token_program.to_account_info(), accounts);
        transfer_checked(cpi, ctx.accounts.config.platform_fee, ctx.accounts.nome_mint.decimals)?;
    }

    emit!(TournamentCreated {
        id: tournament.id,
        config: tournament_config
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(tournament_data: TournamentConfig)]
pub(crate) struct CreateTournament<'info> {
    #[account(mut)]
    organizer: Signer<'info>,

    sponsor: SystemAccount<'info>,

    #[account(mut, seeds = [GENOME_ROOT, SINGLE_CONFIG], bump)]
    config: Account<'info, GenomeSingleConfig>,

    #[account(
        seeds = [GENOME_ROOT, ROLE, organizer.key().as_ref()],
        bump,
        constraint = role_info.roles.contains(&Role::Organizer) @ GenomeError::NotAllowed
    )]
    role_info: Account<'info, RoleInfo>,

    #[account(
        seeds = [GENOME_ROOT, ROLE, Role::Verifier.to_seed()],
        bump,
    )]
    verifier_list: Account<'info, RoleList>,

    #[account(
        init,
        payer = organizer,
        space = Tournament::DISCRIMINATOR.len() + Tournament::INIT_SPACE,
        seeds = [GENOME_ROOT, TOURNAMENT, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    tournament: Account<'info, Tournament>,

    #[account(
        init,
        payer = organizer,
        space = Consensus::DISCRIMINATOR.len() + Consensus::INIT_SPACE,
        seeds = [GENOME_ROOT, CONSENSUS, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub consensus: Account<'info, Consensus>,

    #[account(
        init,
        payer = organizer,
        space = FinishMetaData::DISCRIMINATOR.len() + FinishMetaData::INIT_SPACE + PUBKEY_BYTES * verifier_list.accounts.len(),
        seeds = [GENOME_ROOT, FINISH, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    finish_meta_data: Account<'info, FinishMetaData>,

    asset_mint: InterfaceAccount<'info, Mint>,

    #[account(constraint = nome_mint.key() == config.nome_mint @ GenomeError::InvalidNome)]
    nome_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [GENOME_ROOT, TOKEN, asset_mint.key().as_ref()],
        bump,
    )]
    token_info: Account<'info, TokenInfo>,

    #[account(
        init,
        payer = organizer,
        associated_token::mint = asset_mint,
        associated_token::authority = tournament,
        associated_token::token_program = token_program,
    )]
    reward_pool_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = organizer,
        associated_token::mint = asset_mint,
        associated_token::authority = sponsor,
        associated_token::token_program = token_program,
    )]
    sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = organizer,
    )]
    organizer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = nome_mint,
        associated_token::authority = config.platform_wallet,
    )]
    platform_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = organizer,
        space = BloomFilter::DISCRIMINATOR.len() + calculate_bloom_memory(tournament_data.max_teams * tournament_data.team_size, config.false_precision)?,
        seeds = [GENOME_ROOT, BLOOM, config.tournament_nonce.to_le_bytes().as_ref()],
        bump
    )]
    bloom_filter: Box<Account<'info, BloomFilter>>,

    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

#[event]
pub(crate) struct TournamentCreated {
    pub(crate) id: u32,
    pub(crate) config: TournamentConfig,
}
