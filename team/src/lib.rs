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
        let captain_info = ParticipantInfo {
            paid_by_captain: true,
            refunded: false,
        };
        Self {
            captain,
            participants: [(captain, captain_info)].into(),
            team_size,
        }
    }

    pub fn add_participant_by_captain(&mut self, participant: Pubkey) -> Result<()> {
        let participants = &mut self.participants;
        require!(participants.len().lt(&self.team_size), TournamentError::TeamSize);

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
        require!(participants.len().lt(&self.team_size), TournamentError::TeamSize);

        let info = ParticipantInfo::default();
        if self.participants.insert(participant, info).is_some() {
            return Err(TournamentError::AlreadyRegistered.into());
        }
        Ok(())
    }

    pub fn refund_participant(&mut self, participant: &Pubkey) -> Result<usize> {
        let info = self.participants.get_mut(participant).ok_or(TournamentError::ParticipantNotFound)?;

        if info.refunded {
            return Ok(0);
        }

        info.refunded = true;

        if !info.paid_by_captain {
            return Ok(1);
        }

        if *participant == self.captain {
            let count = self.participants.values().filter(|p| p.paid_by_captain).count();
            return Ok(count);
        }

        Ok(0)
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
        assert_eq!(team.participants.len(), 2);
        assert!(participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_by_captain_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        for _ in 1..TEAM_SIZE {
            assert!(team.add_participant_by_captain(new_pubkey()).is_ok());
        }

        let result = team.add_participant_by_captain(participant).expect_err("Expected an error");
        assert_eq!(result, TournamentError::TeamSize.into());
    }

    #[test]
    fn test_add_participant_by_captain_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant).is_ok());

        let result = team.add_participant_by_captain(participant).expect_err("Expected an error");
        assert_eq!(result, TournamentError::AlreadyRegistered.into());
    }

    #[test]
    fn test_add_participant_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let participant_info = team.participants.get(&participant).unwrap();
        assert_eq!(team.participants.len(), 2);
        assert!(!participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        for _ in 1..TEAM_SIZE {
            assert!(team.add_participant(new_pubkey()).is_ok());
        }

        let result = team.add_participant(participant).expect_err("Expected an error");
        assert_eq!(result, TournamentError::TeamSize.into());
    }

    #[test]
    fn test_add_participant_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let result = team.add_participant(participant).expect_err("Expected an error");
        assert_eq!(result, TournamentError::AlreadyRegistered.into());
    }

    #[test]
    fn test_refund_participant_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant(participant).is_ok());

        let result = team.refund_participant(&participant).expect("Expected participant refunded");

        assert_eq!(result, 1);

        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.refunded);
    }

    #[test]
    fn test_refund_participant_paid_by_captain_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant).is_ok());

        let result = team.refund_participant(&participant).expect("Expected participant refunded");

        assert_eq!(result, 0);

        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.refunded);
    }

    #[test]
    fn test_refund_captain_success() {
        let captain = new_pubkey();
        let participant_1 = new_pubkey();
        let participant_2 = new_pubkey();
        let participant_3 = new_pubkey();
        let participant_4 = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        assert!(team.add_participant_by_captain(participant_1).is_ok());
        assert!(team.add_participant_by_captain(participant_2).is_ok());
        assert!(team.add_participant_by_captain(participant_3).is_ok());
        assert!(team.add_participant(participant_4).is_ok());

        let result = team.refund_participant(&captain).expect("Expected participant refunded");

        assert_eq!(result, 4);
    }

    #[test]
    fn test_refund_participant_not_found() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain, TEAM_SIZE);

        let result = team.refund_participant(&participant).expect_err("Expected an error");
        assert_eq!(result, TournamentError::ParticipantNotFound.into());
    }
}
