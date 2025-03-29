use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Max players exceeded(3200)")]
    MaxPlayersExceeded,
    #[msg("Invalid entry fee")]
    InvalidEntryFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid organizer fee")]
    InvalidOrginizerFee,
    #[msg("Invalid admin account is provided")]
    InvalidAdmin,
    #[msg("Invalid role is provided")]
    InvalidRole,
    #[msg("Serialization error")]
    SerializationError,
}
