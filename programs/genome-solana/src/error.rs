use anchor_lang::prelude::*;

#[error_code]
pub(crate) enum GenomeError {
    #[msg("The list of verifiers must be empty")]
    InvalidConfig,
    #[msg("Role already granted")]
    RoleAlreadyGranted,
    #[msg("Role not found")]
    RoleNotFound,
    #[msg("Not allowed")]
    NotAllowed,
}
