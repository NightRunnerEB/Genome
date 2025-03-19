use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Max players exceeded(3200)")]
    MaxPlayersExceeded,
    #[msg("Invalid admission fee")]
    InvalidAdmissionFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid royalty")]
    InvalidRoyalty,
    #[msg("Invalid admin account is provided")]
    InvalidAdmin,
    #[msg("Serialization error")]
    SerializationError,
}
