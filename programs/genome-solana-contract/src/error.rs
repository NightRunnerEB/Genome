use anchor_lang::prelude::*;

#[error_code]
pub enum TournamentError {
    #[msg("MaxPlayersExceeded(3200)")]
    MaxPlayersExceeded,
    #[msg("AlreadyRegistered")]
    AlreadyRegistered,
    #[msg("ParticipantNotFound")]
    ParticipantNotFound,
    #[msg("InvalidAdmissionFee")]
    InvalidAdmissionFee,
    #[msg("InvalidPrizePool")]
    InvalidSponsorPool,
    #[msg("InvalidTeamsCount")]
    InvalidTeamsCount,
    #[msg("InvalidTeamCapacity")]
    InvalidTeamCapacity,
    #[msg("InvalidAmountOfPlayers")]
    InvalidAmountOfPlayers,
    #[msg("InvalidRoyalty")]
    InvalidRoyalty,
    #[msg("SerializationError")]
    SerializationError,
}
