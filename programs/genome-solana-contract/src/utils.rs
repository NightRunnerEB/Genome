use crate::{error::TournamentError, state::{BloomFilterAccount, GenomeConfig, Tournament, TournamentData}};
use anchor_lang::{error, prelude::{Account, Result}, require};
use solana_program::msg;
use growable_bloom_filter::GrowableBloom as Bloom;

const MIN_TEAM_PLAYERS_CAPACITY: u16 = 1;
const FP_P: f64 = 0.000065;

pub fn calculate_bloom_memory(players_count: u16) -> Result<usize> {
    if players_count > 3200 {
        return Err(TournamentError::MaxPlayersExceeded.into());
    }
    let false_positive_rate = 0.000065;
    let num_slices = ((1.0_f64 / false_positive_rate).log2()).ceil() as u64;
    let slice_len_bits = (players_count as f64 / 2f64.ln()).ceil() as u64;
    let total_bits = num_slices * slice_len_bits;
    let buffer_bytes = ((total_bits + 7) / 8) as usize;
    let memory = 8*9 + 4 + buffer_bytes;
    return Ok(memory)
}

pub fn validate_params(params: &TournamentData, config: &GenomeConfig) -> Result<()> {
    require!(
        params.organizer_royalty <= config.max_organizer_royalty,
        TournamentError::InvalidRoyalty
    );
    require!(
        params.entry_fee >= config.min_entry_fee,
        TournamentError::InvalidAdmissionFee
    );
    require!(
        params.min_teams >= config.min_teams && params.max_teams <= config.max_teams,
        TournamentError::InvalidTeamLimit
    );
    require!(
        params.sponsor_pool >= config.min_sponsor_pool,
        TournamentError::InvalidSponsorPool
    );
    require!(
        params.sponsor_fee <= config.max_sponsor_fee,
        TournamentError::InvalidSponsorFee
    );
    require!(
        params.participant_per_team >= MIN_TEAM_PLAYERS_CAPACITY,
        TournamentError::InvalidTeamCapacity
    );
    Ok(())
}

pub fn initialize_bloom_filter(
    tournament: &Tournament,
    bloom_filter: &mut Account<BloomFilterAccount>,
) -> Result<()> {
    let items_count = tournament.max_teams * tournament.participant_per_team;
    let bloom = Bloom::new(FP_P, items_count as usize);
    bloom_filter.data = bincode::serialize(&bloom)
        .map_err(|_| error!(TournamentError::SerializationError))?;
    Ok(())
}

