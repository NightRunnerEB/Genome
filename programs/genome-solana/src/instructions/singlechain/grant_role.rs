use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, pubkey::PUBKEY_BYTES, system_instruction},
};

use crate::{
    data::{Role, RoleInfo, RoleList},
    error::GenomeError,
    realloc, GenomeSingleConfig, GENOME_ROOT, ROLE, SINGLE_CONFIG,
};

pub(crate) fn handle_grant_role(ctx: Context<GrantRole>, role: Role) -> Result<()> {
    require!(!ctx.accounts.role_info.roles.contains(&role), GenomeError::RoleAlreadyGranted);

    let role_list_info = ctx.accounts.role_list.to_account_info();

    if role_list_info.data_is_empty() {
        let init_space = RoleList::DISCRIMINATOR.len() + RoleList::INIT_SPACE;
        let rent = Rent::get()?.minimum_balance(init_space);

        let seeds = &[GENOME_ROOT, ROLE, role.to_seed()];
        let (pda, bump) = Pubkey::find_program_address(seeds, ctx.program_id);
        require!(pda == role_list_info.key(), GenomeError::InvalidPda);

        let create_ix = system_instruction::create_account(
            ctx.accounts.admin.key,
            role_list_info.key,
            rent,
            init_space as u64,
            ctx.program_id,
        );
        invoke_signed(
            &create_ix,
            &[
                ctx.accounts.admin.to_account_info(),
                role_list_info.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[GENOME_ROOT, ROLE, role.to_seed(), &[bump]]],
        )?;

        role_list_info.data.borrow_mut()[..RoleList::DISCRIMINATOR.len()]
            .copy_from_slice(RoleList::DISCRIMINATOR);
    }

    let current_count = {
        let data = &role_list_info.data.borrow();
        let role_list = RoleList::try_from_slice(&data[RoleList::DISCRIMINATOR.len()..])
            .expect("Deserialization error 1");
        role_list.accounts.len()
    };

    require!(
        role != Role::Verifier || current_count < RoleList::MAX_VERIFIERS_COUNT,
        GenomeError::MaxVerifiersExceeded
    );

    let new_count = current_count + 1;
    let new_space =
        RoleList::DISCRIMINATOR.len() + RoleList::INIT_SPACE + (new_count * PUBKEY_BYTES);
    realloc(role_list_info.clone(), ctx.accounts.admin.to_account_info(), new_space)?;

    {
        let mut data = role_list_info.data.borrow_mut();
        let mut role_list = RoleList::try_from_slice(
            &data[RoleList::DISCRIMINATOR.len()..new_space - PUBKEY_BYTES],
        )
        .expect("Deserialization error 2");
        role_list.accounts.push(*ctx.accounts.user.key);
        role_list.serialize(&mut &mut data[RoleList::DISCRIMINATOR.len()..])?;
    }

    ctx.accounts.role_info.roles.push(role);

    Ok(())
}

#[derive(Accounts)]
#[instruction(role: Role)]
pub(crate) struct GrantRole<'info> {
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

    /// CHECK: initialization and account verification occurs in the instruction for the possibility of executing realloc
    #[account(mut)]
    role_list: UncheckedAccount<'info>,

    system_program: Program<'info, System>,
}
