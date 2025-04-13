use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum GenomeError {
    #[msg("Max players exceeded")]
    MaxPlayersExceeded,
    #[msg("Participant not found")]
    ParticipantNotFound,
    #[msg("Invalid entry fee")]
    InvalidEntryFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid false precision")]
    InvalidPrecision,
    #[msg("Invalid organizer fee")]
    InvalidOrginizerFee,
    #[msg("Expiration time is in the past")]
    InvalidExpirationTime,
    #[msg("Invalid nome mint")]
    InvalidNome,
    #[msg("Invalid tournament mint")]
    InvalidToken,
    #[msg("The list of verifiers must be empty")]
    InvalidConfig,
    #[msg("Role already granted")]
    RoleAlreadyGranted,
    #[msg("Role not found")]
    RoleNotFound,
    #[msg("Verifier already voted")]
    AlreadyVoted,
    #[msg("Not Allowed")]
    NotAllowed,
    #[msg("Invalid tournament status")]
    InvalidStatus,
    #[msg("Participant already registered")]
    AlreadyRegistered,
    #[msg("Captain is not winner")]
    NotWinner,
    #[msg("Paricipant already claimed")]
    AlreadyClaimed,
    #[msg("The tournament doesn't have any completed teams yet.")]
    NoCompletedTeams,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
