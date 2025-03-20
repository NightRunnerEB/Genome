import * as anchor from "@coral-xyz/anchor";
import { getKeyPairs } from "./utils";

const { admin, organizer, sponsor, token, captain, participant1, participant2, participant3 } = getKeyPairs();

export const tournamentDataMock = {
    organizer: organizer.publicKey,
    sponsor: sponsor.publicKey,
    organizerRoyalty: new anchor.BN(100),
    sponsorPool: new anchor.BN(1000),
    expirationTime: new anchor.BN(Math.floor(Date.now() / 1000)),
    entryFee: new anchor.BN(20),
    teamSize: 10,
    minTeams: 4,
    maxTeams: 10,
    assetMint: token.publicKey,
};

export const configData = {
    admin: admin.publicKey,
    platformWallet: admin.publicKey,
    verifierAddresses: [],
    platformFee: new anchor.BN(10),
    minEntryFee: new anchor.BN(10),
    minSponsorPool: new anchor.BN(500),
    maxOrganizerRoyalty: new anchor.BN(5000),
    tournamentNonce: 0,
    minTeams: 2,
    maxTeams: 20,
    consensusRate: new anchor.BN(60),
    falsePrecision: 0.000065,
};

export const registerParams1 = {
    tournamentId: 0,
    participant: captain.publicKey,
    captain: captain.publicKey,
    teammates: [participant1.publicKey, participant2.publicKey]
}

export const registerParams2 = {
    tournamentId: 0,
    participant: participant1.publicKey,
    captain: captain.publicKey,
    teammates: []
}

export const registerParams3 = {
    tournamentId: 0,
    participant: participant3.publicKey,
    captain: captain.publicKey,
    teammates: []
}