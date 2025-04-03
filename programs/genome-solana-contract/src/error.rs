use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum TournamentError {
    #[msg("Not Allowed")]
    NotAllowed,
    #[msg("Max players exceeded")]
    MaxPlayersExceeded,
    #[msg("Invalid entry fee")]
    InvalidEntryFee,
    #[msg("Invalid sponsor pool")]
    InvalidSponsorPool,
    #[msg("Invalid teams count")]
    InvalidTeamsCount,
    #[msg("Invalid organizer fee")]
    InvalidOrginizerFee,
    #[msg("Role already granted")]
    RoleAlreadyGranted,
    #[msg("Role not found")]
    RoleNotFound,
    #[msg("Invalid Params")]
    InvalidParams,
}
