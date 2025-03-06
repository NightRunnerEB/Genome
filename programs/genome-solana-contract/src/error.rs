use anchor_lang::prelude::*;

#[error_code]
pub enum TournamentError {
    #[msg("MaxPlayersExceeded")]
    MaxPlayersExceeded,
    #[msg("AlreadyRegistered")]
    AlreadyRegistered,
    #[msg("ParticipantNotFound")]
    ParticipantNotFound,
    #[msg("InvalidAdmissionFee")]
    InvalidAdmissionFee,
    #[msg("InvalidPrizePool")]
    InvalidSponsorPool,
    #[msg("InvalidTeamLimit")]
    InvalidTeamLimit,
    #[msg("InvalidTeamCapacity")]
    InvalidTeamCapacity,
    #[msg("InvalidAmountOfPlayers")]
    InvalidAmountOfPlayers,
    #[msg("InvalidRoyalty")]
    InvalidRoyalty,
    #[msg("SerializationError")]
    SerializationError,
}
