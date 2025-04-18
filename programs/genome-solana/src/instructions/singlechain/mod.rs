use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction},
};

pub(crate) mod initialize;
pub(crate) use initialize::*;

pub(crate) mod approve_token;
pub(crate) use approve_token::*;

pub(crate) mod ban_token;
pub(crate) use ban_token::*;

pub(crate) mod grant_role;
pub(crate) use grant_role::*;

pub(crate) mod revoke_role;
pub(crate) use revoke_role::*;

pub(crate) mod create_tournament;
pub(crate) use create_tournament::*;

pub(crate) mod register_tournament;
pub(crate) use register_tournament::*;

pub(crate) mod set_bloom_precision;
pub(crate) use set_bloom_precision::*;

pub(crate) mod start_tournament;
pub(crate) use start_tournament::*;

pub(crate) mod cancel_tournament;
pub(crate) use cancel_tournament::*;

pub(crate) mod finish_tournament;
pub(crate) use finish_tournament::*;

pub(crate) mod claim_refund;
pub(crate) use claim_refund::*;

pub(crate) mod claim_role_fund;
pub(crate) use claim_role_fund::*;

pub(crate) mod claim_sponros_refund;
pub(crate) use claim_sponros_refund::*;

pub(crate) mod claim_reward;
pub(crate) use claim_reward::*;

pub(crate) mod withdraw;
pub(crate) use withdraw::*;

pub(crate) fn realloc<'info>(
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

pub(crate) fn system_transfer<'a>(
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    let ix = system_instruction::transfer(from.key, to.key, amount);
    invoke(&ix, &[from.clone(), to.clone()])?;
    Ok(())
}
