use anchor_lang::prelude::*;

declare_id!("FyHw7Y9XgfGMo8CbzHPoica4PoApxBQfrDZzs8kmwW6K");

#[program]
pub mod genome_solana_contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
