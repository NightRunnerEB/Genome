use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Max players exceeded")]
    MaxPlayersExceeded,
    #[msg("The list of verifiers must be empty")]
    InvalidGenomeConfig,
    #[msg("Invalid entry fee")]
    InvalidEntryFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid organizer fee")]
    InvalidOrginizerFee,
    #[msg("Expiration time is in the past")]
    InvalidExpirationTime,
    #[msg("Invalid nome mint")]
    InvalidNome,
    #[msg("Role already granted")]
    RoleAlreadyGranted,
    #[msg("Role not found")]
    RoleNotFound,
    #[msg("Not Allowed")]
    NotAllowed,
}
