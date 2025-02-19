mod error;

use std::collections::BTreeMap;
use anchor_lang::prelude::*;
use error::TournamentError;

pub const MAX_PARTICIPANTS: usize = 30;


pub struct ParticipantInfo {
    pub paid_by_captain: bool,
    pub refunded: bool
}

#[derive(Default)]
pub struct Team {
    pub captain: Pubkey,
    pub participants: BTreeMap<Pubkey, ParticipantInfo>,
}

impl Team {

    pub fn new(captain: Pubkey) -> Self {
        Self {
            captain,
            participants: BTreeMap::new(),
        }
    }

    pub fn add_participant_by_captain(
        &mut self,
        participant: Pubkey,
    ) -> Result<()> {
        if self.participants.len() >= MAX_PARTICIPANTS {
            return err!(TournamentError::MaxPlayersExceeded);
        }
        let info = ParticipantInfo {
            paid_by_captain: true,
            refunded: false,
        };
        if self.participants.insert(participant, info).is_some() {
            return err!(TournamentError::AlreadyRegistered);
        }
        Ok(())
    }

    pub fn add_participant(
        &mut self,
        participant: Pubkey,
    ) -> Result<()> {
        if self.participants.len() >= MAX_PARTICIPANTS {
            return err!(TournamentError::MaxPlayersExceeded);
        }
        let info = ParticipantInfo {
            paid_by_captain: false,
            refunded: false,
        };
        if self.participants.insert(participant, info).is_some() {
            return err!(TournamentError::AlreadyRegistered);
        }
        Ok(())
    }

    pub fn get_refund_account(&mut self, participant: &Pubkey) -> Result<Pubkey> {
        if let Some(info) = self.participants.get_mut(participant) {
            if !info.refunded {
                info.refunded = true;
                return Ok(*participant);
            }
        }
        return err!(TournamentError::ParticipantNotFound);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn new_pubkey() -> Pubkey {
        Pubkey::new_unique()
    }

    #[test]
    fn test_add_participant_by_captain_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let result = team.add_participant_by_captain(participant);
        
        assert!(result.is_ok());
        assert_eq!(team.participants.len(), 1);
        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_by_captain_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        for _ in 0..MAX_PARTICIPANTS {
            let _ = team.add_participant_by_captain(new_pubkey());
        }

        let result = team.add_participant_by_captain(participant);

        match result.unwrap_err() {
            Error::AnchorError(err) => {
                assert_eq!(err.error_name, "MaxPlayersExceeded");
            }
            _ => panic!("Expected MaxPlayersExceeded error"),
        }
    }

    #[test]
    fn test_add_participant_by_captain_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let _ = team.add_participant_by_captain(participant);

        let result = team.add_participant_by_captain(participant);

        match result.unwrap_err() {
            Error::AnchorError(err) => {
                assert_eq!(err.error_name, "AlreadyRegistered");
            }
            _ => panic!("Expected AlreadyRegistered error"),
        }
        
    }

    #[test]
    fn test_add_participant_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let result = team.add_participant(participant);

        assert!(result.is_ok());
        assert_eq!(team.participants.len(), 1);
        let participant_info = team.participants.get(&participant).unwrap();
        assert!(!participant_info.paid_by_captain);
        assert!(!participant_info.refunded);
    }

    #[test]
    fn test_add_participant_max_players() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        for _ in 0..MAX_PARTICIPANTS {
            let _ = team.add_participant(new_pubkey());
        }

        let result = team.add_participant(participant);

        match result.unwrap_err() {
            Error::AnchorError(err) => {
                assert_eq!(err.error_name, "MaxPlayersExceeded");
            }
            _ => panic!("Expected MaxPlayersExceeded error"),
        }
    }

    #[test]
    fn test_add_participant_already_registered() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let _ = team.add_participant(participant);

        let result = team.add_participant(participant);

        match result.unwrap_err() {
            Error::AnchorError(err) => {
                assert_eq!(err.error_name, "AlreadyRegistered");
            }
            _ => panic!("Expected AlreadyRegistered error"),
        }
    }

    #[test]
    fn test_get_refunde_account_success() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let _ = team.add_participant(participant);

        let result = team.get_refund_account(&participant);

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), participant);

        let participant_info = team.participants.get(&participant).unwrap();
        assert!(participant_info.refunded);
    }

    #[test]
    fn test_get_refunde_account_participant_not_found() {
        let captain = new_pubkey();
        let participant = new_pubkey();
        let mut team = Team::new(captain);

        let result = team.get_refund_account(&participant);

        match result.unwrap_err() {
            Error::AnchorError(err) => {
                assert_eq!(err.error_name, "ParticipantNotFound");
            }
            _ => panic!("Expected ParticipantNotFound error"),
        }
    }
}
