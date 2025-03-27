use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Invalid role")]
    InvalidRole,
}
