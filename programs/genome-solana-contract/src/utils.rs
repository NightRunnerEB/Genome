use anchor_lang::{
    prelude::{Account, Result},
    require,
};
use growable_bloom_filter::GrowableBloom as Bloom;

use crate::{
    data::{BloomFilter, GenomeConfig, TokenInfo, Tournament, TournamentData},
    error::TournamentError,
};

const MAX_MEMORY: usize = 8156;

pub fn calculate_bloom_memory(participants_count: u16, false_precision: f64) -> Result<usize> {
    let overhead: usize = 76;
    let num_slices = ((1.0_f64 / false_precision).log2()).ceil();
    let ln2 = std::f64::consts::LN_2;
    let max_participants_count = (((MAX_MEMORY - overhead) as f64 * 8.0 * ln2) / num_slices).floor() as u16;
    if participants_count > max_participants_count {
        return Err(TournamentError::MaxPlayersExceeded.into());
    }
    let slice_len_bits = (participants_count as f64 / 2f64.ln()).ceil();
    let total_bits = num_slices * slice_len_bits;
    let buffer_bytes = ((total_bits + 7.0) / 8.0) as usize;
    let memory = overhead + buffer_bytes;
    Ok(memory)
}

pub fn validate_params(
    params: &TournamentData,
    config: &GenomeConfig,
    token_info: &TokenInfo,
) -> Result<()> {
    require!(params.organizer_fee <= config.max_organizer_fee, TournamentError::InvalidOrginizerFee);
    require!(params.entry_fee >= token_info.min_entry_fee, TournamentError::InvalidEntryFee);
    require!(params.sponsor_pool >= token_info.min_sponsor_pool, TournamentError::InvalidSponsorPool);
    require!(
        params.min_teams >= config.min_teams && params.max_teams <= config.max_teams,
        TournamentError::InvalidTeamsCount
    );
    Ok(())
}

pub fn initialize_bloom_filter(
    tournament: &Tournament,
    false_precision: &f64,
    bloom_filter: &mut Account<BloomFilter>,
) -> Result<()> {
    let items_count = tournament.tournament_data.max_teams * tournament.tournament_data.team_size;
    let bloom = Bloom::new(*false_precision, items_count as usize);
    bloom_filter.data = bincode::serialize(&bloom).expect("Failed to serialize bloom filter");
    Ok(())
}
