import { Keypair, PublicKey } from "@solana/web3.js";
import { Account as SplTokenAccount } from "@solana/spl-token";
import * as assert from "assert";
import { describe, it } from "mocha";

import { IxBuilder } from "../../common/ixBuilder";
import { getKeyPairs, checkAnchorError, MARKS } from "../utils";
import { getTournament, buildAndSendTx, getAtaInfo, getRoleInfo, getSingleConfig, getGenomePda, GENOME_SINGLE_CONFIG, PLATFORM, GenomeSingleConfig, getFinishInfo } from "../../common/utils";

describe("Finish Tournament", () => {
    const tournamentId = 0;
    let ixBuilder: IxBuilder;
    let organizer: Keypair,
        operator: Keypair,
        sponsor: Keypair,
        verifier1: Keypair,
        verifier2: Keypair,
        verifier3: Keypair,
        participant: Keypair,
        captain: Keypair,
        admin: Keypair,
        assetMint: Keypair,
        nomeMint: Keypair;

    let configPda: PublicKey;
    let singleConfig: GenomeSingleConfig;
    let organizerAtaBefore: SplTokenAccount;

    before(async () => {
        const keys = await getKeyPairs();
        ixBuilder = new IxBuilder();
        verifier1 = keys.verifier1;
        verifier2 = keys.verifier2;
        verifier3 = keys.verifier3;
        organizer = keys.organizer;
        operator = keys.operator;
        sponsor = keys.sponsor;
        captain = keys.captain1;
        participant = keys.participant1;
        admin = keys.admin;
        assetMint = keys.token;
        nomeMint = keys.nome;

        configPda = await getGenomePda([GENOME_SINGLE_CONFIG]);
        singleConfig = await getSingleConfig();
        organizerAtaBefore = await getAtaInfo(assetMint.publicKey, organizer.publicKey);
    });


  it(`Verifier vote [${MARKS.required}]`, async () => {
    const roleInfoBefore = await getRoleInfo(verifier1.publicKey);
    const startIx = await ixBuilder.finishTournamentIx(verifier1.publicKey, tournamentId, captain.publicKey);
    const txSig = await buildAndSendTx([startIx], [verifier1]);
    console.log("Finish tournament tx (verifier1):", txSig);

    const roleInfoAfter = await getRoleInfo(verifier1.publicKey);
    assert.equal(roleInfoAfter.claim.sub(roleInfoBefore.claim).toNumber(), singleConfig.verifierFee.toNumber());
  });

  it(`Verifier vote second time [${MARKS.negative}]`, async () => {
    const finishIx = await ixBuilder.finishTournamentIx(verifier1.publicKey, tournamentId, captain.publicKey);
    try {
      await buildAndSendTx([finishIx], [verifier1]);
      throw new Error("Expected error for second voting");
    } catch (error) {
      checkAnchorError(error, "Verifier already voted");
    }
  });

  it(`Claim reward before the tournament finish [${MARKS.negative}]`, async () => {
    const claimRewardIx = await ixBuilder.claimRewardIx(participant.publicKey, tournamentId, captain.publicKey);
    try {
      await buildAndSendTx([claimRewardIx], [participant]);
      throw new Error("Expected error for premature claim not thrown");
    } catch (error) {
      checkAnchorError(error, "Invalid tournament status");
    }
  });

  it(`Finish tournament [${MARKS.required}]`, async () => {
    const finishIx = await ixBuilder.finishTournamentIx(verifier2.publicKey, tournamentId, captain.publicKey);
    const txSig = await buildAndSendTx([finishIx], [verifier2]);
    console.log("Finish tournament tx (verifier2):", txSig);

    const tournament = await getTournament(tournamentId);
    assert.ok(tournament.status.finished, "Tournament should be finished");
    console.log("Tournament finished");
  });

  it(`Claim reward by participant [${MARKS.required}]`, async () => {
    const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, participant.publicKey);
    const claimRewardIx = await ixBuilder.claimRewardIx(participant.publicKey, tournamentId, captain.publicKey);
    const claimTxSig = await buildAndSendTx([claimRewardIx], [participant]);
    console.log("Claim reward tx signature:", claimTxSig);

    const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, participant.publicKey);
    const finishMetaData = await getFinishInfo(tournamentId);
    assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, finishMetaData.reward.toNumber());
  });

  it(`Check organizer reward [${MARKS.required}]`, async () => {
    const organizerAtaAfter = await getAtaInfo(assetMint.publicKey, participant.publicKey);
    const finishMetaData = await getFinishInfo(tournamentId);
    assert.equal(organizerAtaAfter.amount - organizerAtaBefore.amount, finishMetaData.reward.toNumber());
  });
});
