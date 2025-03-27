use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Invalid admin account is provided")]
    InvalidAdmin,
    #[msg("Invalid role is provided")]
    InvalidRole,
}
