use anchor_lang::{
    error,
    prelude::{Account, Result},
    require,
};
use growable_bloom_filter::GrowableBloom as Bloom;

use crate::{
    data::{BloomFilter, GenomeConfig, TokenInfo, Tournament, TournamentData},
    error::TournamentError,
};

const MAX_TEAM_SIZE: u16 = 3200;

pub fn calculate_bloom_memory(players_count: u16, false_precision: f64) -> Result<usize> {
    if players_count > MAX_TEAM_SIZE {
        return Err(TournamentError::MaxPlayersExceeded.into());
    }
    let num_slices = ((1.0_f64 / false_precision).log2()).ceil() as u64;
    let slice_len_bits = (players_count as f64 / 2f64.ln()).ceil() as u64;
    let total_bits = num_slices * slice_len_bits;
    let buffer_bytes = ((total_bits + 7) / 8) as usize;
    let memory = 8 * 9 + 4 + buffer_bytes;
    Ok(memory)
}

pub fn validate_params(
    params: &TournamentData,
    config: &GenomeConfig,
    token_info: &TokenInfo,
) -> Result<()> {
    require!(
        params.organizer_fee <= config.max_organizer_fee,
        TournamentError::InvalidOrginizerFee
    );
    require!(
        params.entry_fee >= token_info.min_entry_fee,
        TournamentError::InvalidEntryFee
    );
    require!(
        params.min_teams >= config.min_teams && params.max_teams <= config.max_teams,
        TournamentError::InvalidTeamsCount
    );
    require!(
        params.sponsor_pool >= token_info.min_sponsor_pool,
        TournamentError::InvalidSponsorPool
    );
    Ok(())
}

pub fn initialize_bloom_filter(
    tournament: &Tournament,
    false_precision: &f64,
    bloom_filter: &mut Account<BloomFilter>,
) -> Result<()> {
    let items_count = tournament.max_teams * tournament.team_size;
    let bloom = Bloom::new(*false_precision, items_count as usize);
    bloom_filter.data =
        bincode::serialize(&bloom).map_err(|_| error!(TournamentError::SerializationError))?;
    Ok(())
}
