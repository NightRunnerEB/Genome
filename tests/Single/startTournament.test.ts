import { Keypair } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as assert from "assert";
import { describe, it } from "mocha";

import { IxBuilder } from "../../common/ixBuilder";
import { getKeyPairs, checkAnchorError, MARKS } from "../utils";
import { getTournament, airdropAll, buildAndSendTx, getProvider, getGenomePda, TEAM, getAtaInfo } from "../../common/utils";

const CONNECTION = getProvider().connection;

describe("Start Tournament", () => {
  const tournamentId = 0; // team_size = 2
  let ixBuilder: IxBuilder;
  let deployer: Keypair,
    verifier1: Keypair,
    verifier2: Keypair,
    organizer: Keypair,
    mockCaptains: Keypair[],
    participant: Keypair,
    admin: Keypair,
    assetMint: Keypair;

  before(async () => {
    ixBuilder = new IxBuilder();
    const keys = await getKeyPairs();
    deployer = keys.deployer;
    verifier1 = keys.verifier1;
    verifier2 = keys.verifier2;
    organizer = keys.organizer;
    mockCaptains = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
    participant = keys.participant1;
    admin = keys.admin;
    assetMint = keys.token;


    await airdropAll(
      [
        ...mockCaptains.map((k) => k.publicKey),
      ],
      10
    );

    for (const cap of mockCaptains) {
      const ata = await createAssociatedTokenAccount(
        CONNECTION,
        cap,
        assetMint.publicKey,
        cap.publicKey,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await mintTo(
        CONNECTION,
        cap,
        assetMint.publicKey,
        ata,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_PROGRAM_ID
      );
    }

    for (const cap of mockCaptains) {
      const registerParams = {
        tournamentId,
        participant: cap.publicKey,
        captain: cap.publicKey,
        teammates: []
      };
      const regIx = await ixBuilder.registerTournamentIx(registerParams);
      await buildAndSendTx([regIx], [cap]);
    }
  });


  it(`Start tournament [${MARKS.required}]`, async () => {
    const startIx1 = await ixBuilder.startTournamentIx(verifier1.publicKey, tournamentId);
    const txSig1 = await buildAndSendTx([startIx1], [verifier1]);
    console.log("Start tournament tx (verifier1):", txSig1);

    try {
      const claimRewardIx = await ixBuilder.claimRewardIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
      await buildAndSendTx([claimRewardIx], [mockCaptains[0]]);
      throw new Error("Expected error for premature claim not thrown");
    } catch (error) {
      checkAnchorError(error, "Invalid tournament status");
    }

    const startIx2 = await ixBuilder.startTournamentIx(verifier2.publicKey, tournamentId);
    const txSig2 = await buildAndSendTx([startIx2], [verifier2]);
    console.log("Start tournament tx (verifier2):", txSig2);

    const tournamentAfter = await getTournament(tournamentId);
    assert.ok(tournamentAfter.status.started, "Tournament should be started");
    console.log("Tournament started");
  });

  it(`CLaim refund by participant of non-completed team [${MARKS.required}]`, async () => {
    const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, mockCaptains[0].publicKey);
    const claimRefundIx = await ixBuilder.claimRefundIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
    const claimTxSig = await buildAndSendTx([claimRefundIx], [mockCaptains[0]]);
    console.log("Claim refund tx signature:", claimTxSig);
    const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, mockCaptains[0].publicKey);
    const tournamentAccount = await getTournament(tournamentId);
    assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, tournamentAccount.config.entryFee.toNumber());
  });
});