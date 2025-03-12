use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("MaxPlayersExceeded(3200)")]
    MaxPlayersExceeded,
    #[msg("InvalidAdmissionFee")]
    InvalidAdmissionFee,
    #[msg("InvalidPrizePool")]
    InvalidSponsorPool,
    #[msg("InvalidTeamsCount")]
    InvalidTeamsCount,
    #[msg("InvalidRoyalty")]
    InvalidRoyalty,
}

#[error_code]
pub(crate) enum CustomError {
    #[msg("Invalid admin account is provided")]
    InvalidAdmin,
    #[msg("SerializationError")]
    SerializationError,
}
