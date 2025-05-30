import { Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as assert from "assert";
import { describe, it } from "mocha";

import { IxBuilder } from "../../common/ixBuilder";
import { getKeyPairs, checkAnchorError, MARKS } from "../utils";
import { getTournament, airdropAll, buildAndSendTx, getProvider, getAtaInfo, getRoleInfo, getSingleConfig, GenomeSingleConfig } from "../../common/utils";

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
    assetMint: Keypair,
    nomeMint: Keypair;

  let singleConfig: GenomeSingleConfig;

  before(async () => {
    const keys = await getKeyPairs();
    mockCaptains = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
    ixBuilder = new IxBuilder();
    deployer = keys.deployer;
    verifier1 = keys.verifier1;
    verifier2 = keys.verifier2;
    organizer = keys.organizer;
    participant = keys.participant1;
    admin = keys.admin;
    assetMint = keys.token;
    nomeMint = keys.nome;

    await airdropAll([...mockCaptains.map((k) => k.publicKey)], 10);

    for (const cap of mockCaptains) {
      const ata = await createAssociatedTokenAccount(
        getProvider().connection,
        cap,
        assetMint.publicKey,
        cap.publicKey,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await mintTo(
        getProvider().connection,
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

    singleConfig = await getSingleConfig();
  });


  it(`Verifier vote [${MARKS.required}]`, async () => {
    const roleInfoBefore = await getRoleInfo(verifier1.publicKey);
    const startIx = await ixBuilder.startTournamentIx(verifier1.publicKey, tournamentId);
    const txSig = await buildAndSendTx([startIx], [verifier1]);
    console.log("Start tournament tx (verifier1):", txSig);

    const roleInfoAfter = await getRoleInfo(verifier1.publicKey);
    assert.equal(roleInfoAfter.claim.sub(roleInfoBefore.claim).toNumber(), singleConfig.verifierFee.toNumber());
  });

  it(`Verifier vote second time [${MARKS.negative}]`, async () => {
    const startIx = await ixBuilder.startTournamentIx(verifier1.publicKey, tournamentId);
    try {
      await buildAndSendTx([startIx], [verifier1]);
      throw new Error("Expected error for second voting");
    } catch (error) {
      checkAnchorError(error, "Verifier already voted");
    }
  });

  it(`Claim refund before the tournament start [${MARKS.negative}]`, async () => {
    const claimRefundIx = await ixBuilder.claimRefundIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
    try {
      await buildAndSendTx([claimRefundIx], [mockCaptains[0]]);
      throw new Error("Expected error for premature claim not thrown");
    } catch (error) {
      checkAnchorError(error, "Invalid tournament status");
    }
  });

  it(`Start tournament [${MARKS.required}]`, async () => {
    const startIx2 = await ixBuilder.startTournamentIx(verifier2.publicKey, tournamentId);
    const txSig2 = await buildAndSendTx([startIx2], [verifier2]);
    console.log("Start tournament tx (verifier2):", txSig2);

    const tournament = await getTournament(tournamentId);
    assert.ok(tournament.status.started, "Tournament should be started");
    console.log("Tournament started");
  });

  it(`Claim refund by participant of non-completed team [${MARKS.required}]`, async () => {
    const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, mockCaptains[0].publicKey);
    const claimRefundIx = await ixBuilder.claimRefundIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
    const claimTxSig = await buildAndSendTx([claimRefundIx], [mockCaptains[0]]);
    console.log("Claim refund tx signature(participant):", claimTxSig);

    const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, mockCaptains[0].publicKey);
    const tournamentAccount = await getTournament(tournamentId);
    assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, tournamentAccount.config.entryFee.toNumber());
  });

  it(`Claim fund by verifier [${MARKS.required}]`, async () => {
    const claimerAtaBefore = await getAtaInfo(nomeMint.publicKey, verifier1.publicKey);
    const amountToClaim = new BN(1);
    const claimFundIx = await ixBuilder.claimRoleFundIx(verifier1.publicKey, amountToClaim);
    const claimTxSig = await buildAndSendTx([claimFundIx], [verifier1]);
    console.log("Claim refund tx signature(verifier1):", claimTxSig);

    const claimerAtaAfter = await getAtaInfo(nomeMint.publicKey, verifier1.publicKey);
    assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, amountToClaim);
  });

  it(`Claim insufficient funds by verifier [${MARKS.negative}]`, async () => {
    const amountToClaim = new BN(3);
    const claimFundIx = await ixBuilder.claimRoleFundIx(verifier1.publicKey, amountToClaim);
    try {
      await buildAndSendTx([claimFundIx], [verifier1]);
      throw new Error("Expected error for insufficient funds not thrown");
    } catch (error) {
      checkAnchorError(error, "Insufficient funds");
    }
  });
});
