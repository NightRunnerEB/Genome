use anchor_lang::prelude::*;

#[error_code]
pub enum TournamentError {
    #[msg("Max players exceeded")]
    TeamSize,
    #[msg("Already registered")]
    AlreadyRegistered,
    #[msg("Participant not found")]
    ParticipantNotFound,
}
