use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Max players exceeded(3200)")]
    MaxPlayersExceeded,
    #[msg("Already registered")]
    AlreadyRegistered,
    #[msg("Participant not found")]
    ParticipantNotFound,
    #[msg("Invalid admission fee")]
    InvalidAdmissionFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid team size")]
    InvalidTeamSize,
    #[msg("Invalid organizer royalty")]
    InvalidRoyalty,
    #[msg("Invalid false positive precision")]
    InvalidPrecision,
    #[msg("Invalid status")]
    InvalidStatus,
    #[msg("Invalid admin account is provided")]
    InvalidAdmin,
    #[msg("Invalid token")]
    InvalidToken,
    #[msg("Serialization error")]
    SerializationError,
}
