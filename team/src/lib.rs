mod error;

use anchor_lang::prelude::*;
use error::TournamentError;

use std::collections::BTreeMap;

#[derive(Default)]
pub struct ParticipantInfo {
    pub paid_by_captain: bool,
    pub refunded: bool,
}

pub struct Team {
    pub captain: Pubkey,
    pub participants: BTreeMap<Pubkey, ParticipantInfo>,
    pub team_size: usize,
}

impl Team {
    pub fn new(captain: Pubkey, team_size: usize) -> Self {
        Self {
            captain,
            participants: BTreeMap::new(),
            team_size,
        }
    }

    pub fn add_participant_by_captain(&mut self, participant: Pubkey) -> Result<()> {
        let participants = &mut self.participants;
        require!(
            participants.len().lt(&self.team_size),
            TournamentError::TeamSize
        );

        let info = ParticipantInfo {
            paid_by_captain: true,
            refunded: false,
        };
        if self.participants.insert(participant, info).is_some() {
            return Err(TournamentError::AlreadyRegistered.into());
        }
        Ok(())
    }

    pub fn add_participant(&mut self, participant: Pubkey) -> Result<()> {
        let participants = &mut self.participants;
        require!(
            participants.len().lt(&self.team_size),
            TournamentError::TeamSize
        );

        let info = ParticipantInfo::default();
        if self.participants.insert(participant, info).is_some() {
            return Err(TournamentError::AlreadyRegistered.into());
        }
        Ok(())
    }

    pub fn refund_participant(&mut self, participant: &Pubkey) -> Result<Pubkey> {
        let info = self
            .participants
            .get_mut(participant)
            .ok_or(TournamentError::ParticipantNotFound)?;

        info.refunded = true;
        Ok(if info.paid_by_captain {
            self.captain
        } else {
            *participant
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEAM_SIZE: usize = 30;

    fn new_pubkey() -> Pubkey {
        Pubkey::new_unique()
    }

    #[test]
    fn test_add_participant_by_captain_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant).is_ok());

        let participant_info = team.participants.get(&participant).unwrap();
        assert_eq!(team.participants.len(), 1);
        assert!(participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_by_captain_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        for _ in 0..TEAM_SIZE {
            assert!(team.add_participant_by_captain(new_pubkey()).is_ok());
        }

        let result = team
            .add_participant_by_captain(participant)
            .expect_err("Expected an error");
        assert_eq!(result, TournamentError::TeamSize.into());
    }

    #[test]
    fn test_add_participant_by_captain_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant).is_ok());

        let result = team
            .add_participant_by_captain(participant)
            .expect_err("Expected an error");
        assert_eq!(result, TournamentError::AlreadyRegistered.into());
    }

    #[test]
    fn test_add_participant_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let participant_info = team.participants.get(&participant).unwrap();
        assert_eq!(team.participants.len(), 1);
        assert!(!participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        for _ in 0..TEAM_SIZE {
            assert!(team.add_participant(new_pubkey()).is_ok());
        }

        let result = team
            .add_participant(participant)
            .expect_err("Expected an error");
        assert_eq!(result, TournamentError::TeamSize.into());
    }

    #[test]
    fn test_add_participant_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let result = team
            .add_participant(participant)
            .expect_err("Expected an error");
        assert_eq!(result, TournamentError::AlreadyRegistered.into());
    }

    #[test]
    fn test_refund_participant_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let result = team
            .refund_participant(&participant)
            .expect("Expected participant refunded");

        assert_eq!(result, participant);

        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.refunded);
    }

    #[test]
    fn test_refund_participant_paid_by_captain_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant).is_ok());

        let result = team
            .refund_participant(&participant)
            .expect("Expected participant refunded");

        assert_eq!(result, captain);

        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.refunded);
    }

    #[test]
    fn test_refund_participant_not_found() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        let result = team
            .refund_participant(&participant)
            .expect_err("Expected an error");
        assert_eq!(result, TournamentError::ParticipantNotFound.into());
    }
}
