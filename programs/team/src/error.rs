use anchor_lang::prelude::*;

#[error_code]
pub enum TournamentError {
    #[msg("MaxPlayersExceeded")]
    MaxPlayersExceeded,
    #[msg("NotEligibleTeammate")]
    NotEligibleTeammate,
    #[msg("AlreadyRegistered")]
    AlreadyRegistered,
    #[msg("ParticipantNotFound")]
    ParticipantNotFound,
}
