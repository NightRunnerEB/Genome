use crate::error::TournamentError;
use anchor_lang::prelude::*;

#[derive(Default, Clone, AnchorDeserialize, AnchorSerialize, Debug, PartialEq, Eq, InitSpace)]
pub struct ParticipantInfo {
    pub pubkey: Pubkey,
    pub paid_by_captain: bool,
    pub refunded: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Team {
    pub captain: Pubkey,
    #[max_len(0)]
    pub participants: Vec<ParticipantInfo>,
    pub team_size: u16,
    pub canceled: bool,
}

impl Team {
    pub fn new(captain: Pubkey, team_size: u16) -> Self {
        Self {
            captain,
            participants: vec![],
            team_size,
            canceled: false
        }
    }

    pub fn add_participant_by_captain(&mut self, participant: Pubkey) -> Result<()> {
        if self.participants.len() >= self.team_size as usize {
            return Err(TournamentError::InvalidTeamSize.into());
        }

        self.participants.push(ParticipantInfo {
            pubkey: participant,
            paid_by_captain: true,
            refunded: false,
        });
        Ok(())
    }

    pub fn add_participant(&mut self, participant: Pubkey) -> Result<()> {
        if self.participants.len() >= self.team_size as usize {
            return Err(TournamentError::InvalidTeamSize.into());
        }

        self.participants.push(ParticipantInfo {
            pubkey: participant,
            paid_by_captain: false,
            refunded: false,
        });
        Ok(())
    }

    pub fn refund_participant(&mut self, participant: &Pubkey) -> Result<usize> {
        let participant_info = self
            .participants
            .iter_mut()
            .find(|p| p.pubkey == *participant)
            .ok_or(TournamentError::ParticipantNotFound)?;

        if participant_info.refunded {
            return Ok(0);
        }
        participant_info.refunded = true;

        if !participant_info.paid_by_captain {
            return Ok(1);
        }

        if *participant == self.captain {
            let count = self
                .participants
                .iter()
                .filter(|p| p.paid_by_captain)
                .count();
            return Ok(count);
        }

        Ok(0)
    }
}
