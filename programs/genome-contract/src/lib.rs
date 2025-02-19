use anchor_lang::prelude::*;

declare_id!("GPiYyUzFU8CeU71JGLkvssyBQzXwxAAJEHDM1MRiZn6A");

#[program]
pub mod genome_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
