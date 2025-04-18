use crate::error::GenomeError;
use anchor_lang::prelude::*;

#[derive(Default, Clone, AnchorDeserialize, AnchorSerialize, Debug, PartialEq, Eq, InitSpace)]
pub(crate) struct ParticipantInfo {
    pub(crate) pubkey: Pubkey,
    pub(crate) paid_by_captain: bool,
    pub(crate) claimed: bool,
}

#[account]
#[derive(InitSpace, Debug)]
pub(crate) struct Team {
    pub(crate) captain: Pubkey,
    #[max_len(0)]
    pub(crate) participants: Vec<ParticipantInfo>,
    pub(crate) team_size: u16,
    pub(crate) completed: bool,
}

impl Team {
    pub(crate) fn new(captain: Pubkey, team_size: u16) -> Self {
        Self {
            captain,
            participants: vec![],
            team_size,
            completed: false,
        }
    }

    pub(crate) fn add_participants_by_captain(&mut self, participants: Vec<Pubkey>) -> Result<()> {
        if self.participants.len() + participants.len() > self.team_size as usize {
            return Err(GenomeError::MaxPlayersExceeded.into());
        }

        for participant in participants {
            self.participants.push(ParticipantInfo {
                pubkey: participant,
                paid_by_captain: true,
                claimed: false,
            });
        }

        if self.participants.len() == self.team_size as usize {
            self.completed = true;
        }

        Ok(())
    }

    pub(crate) fn add_participant(&mut self, participant: Pubkey) -> Result<()> {
        if self.participants.len() == self.team_size as usize {
            return Err(GenomeError::MaxPlayersExceeded.into());
        }

        self.participants.push(ParticipantInfo {
            pubkey: participant,
            paid_by_captain: false,
            claimed: false,
        });

        if self.participants.len() == self.team_size as usize {
            self.completed = true;
        }

        Ok(())
    }

    pub(crate) fn refund_participant(&mut self, participant: &Pubkey) -> Result<usize> {
        let participant_info = self
            .participants
            .iter_mut()
            .find(|p| p.pubkey == *participant)
            .ok_or(GenomeError::ParticipantNotFound)?;

        if participant_info.claimed {
            return Err(GenomeError::AlreadyClaimed.into());
        }
        participant_info.claimed = true;

        if !participant_info.paid_by_captain {
            return Ok(1);
        }

        if *participant == self.captain {
            let count = self.participants.iter().filter(|p| p.paid_by_captain).count();
            return Ok(count);
        }

        Ok(0)
    }

    pub(crate) fn reward_participant(&mut self, participant: &Pubkey) -> Result<()> {
        let participant_info = self
            .participants
            .iter_mut()
            .find(|p| p.pubkey == *participant)
            .ok_or(GenomeError::ParticipantNotFound)?;

        if participant_info.claimed {
            return Err(GenomeError::AlreadyClaimed.into());
        }

        participant_info.claimed = true;

        Ok(())
    }
}
