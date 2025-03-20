import { BN } from "@coral-xyz/anchor";

export default {
  // Initialize Genome
  genomeConfig: {
    tournamentNonce: new BN(1),
    platformFee: new BN(10),
    minEntryFee: new BN(10),
    minSponsorPool: new BN(0),
    minTeams: new BN(2),
    maxTeams: new BN(20),
    falsePrecision: 0.000065,
    maxOrganizerRoyalty: new BN(5000),
  },

  // Create tournament
  tournamentData: {
    organizerRoyalty: new BN(100),
    sponsorPool: new BN(0),
    entryFee: new BN(20),
    teamSize: new BN(10),
    minTeams: new BN(4),
    maxTeams: new BN(10),
  },
};
