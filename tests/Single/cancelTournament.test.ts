import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as assert from "assert";
import { describe, it } from "mocha";

import { IxBuilder } from "../../common/ixBuilder";
import { getKeyPairs, checkAnchorError, MARKS } from "../utils";
import { getTournament, buildAndSendTx, getProvider, getAtaInfo, Role, getRoleInfo, getSingleConfig, getGenomePda, GENOME_SINGLE_CONFIG, PLATFORM, GenomeSingleConfig } from "../../common/utils";

describe("Cancel Tournament", () => {
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
    });

    it(`Verifier vote [${MARKS.required}]`, async () => {
        const roleInfoBefore = await getRoleInfo(verifier1.publicKey);
        const cancelIx = await ixBuilder.cancelTournamentIx(verifier1.publicKey, tournamentId);
        const txSig = await buildAndSendTx([cancelIx], [verifier1]);
        console.log("Cancel tournament tx (verifier1):", txSig);

        const roleInfoAfter = await getRoleInfo(verifier1.publicKey);
        assert.equal(roleInfoAfter.claim.sub(roleInfoBefore.claim).toNumber(), singleConfig.verifierFee.toNumber());
    });

    it(`Verifier vote second time [${MARKS.negative}]`, async () => {
        const cancelIx = await ixBuilder.cancelTournamentIx(verifier1.publicKey, tournamentId);
        try {
            await buildAndSendTx([cancelIx], [verifier1]);
            throw new Error("Expected error for second voting");
        } catch (error) {
            checkAnchorError(error, "Verifier already voted");
        }
    });

    it(`Claim refund before the tournament start [${MARKS.negative}]`, async () => {
        const claimRefundIx = await ixBuilder.claimRefundIx(participant.publicKey, tournamentId, captain.publicKey);
        try {
            await buildAndSendTx([claimRefundIx], [participant]);
            throw new Error("Expected error for premature claim not thrown");
        } catch (error) {
            checkAnchorError(error, "Invalid tournament status");
        }
    });

    it(`Cancel tournament [${MARKS.required}]`, async () => {
        const cancelIx = await ixBuilder.cancelTournamentIx(verifier2.publicKey, tournamentId);
        const txSig = await buildAndSendTx([cancelIx], [verifier2]);
        console.log("Cancel tournament tx (verifier2):", txSig);

        const tournamentAfter = await getTournament(tournamentId);
        assert.ok(tournamentAfter.status.canceled, "Tournament should be canceled");
        console.log("Tournament canceled");
    });

    it(`Claim refund by participant[${MARKS.required}]`, async () => {
        // participant was registered by the captain
        const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, participant.publicKey);
        const claimRefundIx = await ixBuilder.claimRefundIx(participant.publicKey, tournamentId, captain.publicKey);
        const claimTxSig = await buildAndSendTx([claimRefundIx], [participant]);
        console.log("Claim refund tx signature(participant):", claimTxSig);

        const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, participant.publicKey);
        assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, 0);
    });

    it(`Claim refund by captain[${MARKS.required}]`, async () => {
        const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, captain.publicKey);
        const claimRefundIx = await ixBuilder.claimRefundIx(captain.publicKey, tournamentId, captain.publicKey);
        const claimTxSig = await buildAndSendTx([claimRefundIx], [captain]);
        console.log("Claim refund tx signature(captain):", claimTxSig);

        const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, participant.publicKey);
        const tournamentAccount = await getTournament(tournamentId);
        assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, tournamentAccount.config.entryFee.toNumber() * 2);
    });

    it(`Claim refund by organizer [${MARKS.required}]`, async () => {
        const claimerAtaBefore = await getAtaInfo(nomeMint.publicKey, organizer.publicKey);
        const amountToClaim = new BN(2);
        const claimRefundIx = await ixBuilder.claimRoleFundIx(organizer.publicKey, amountToClaim);
        const claimTxSig = await buildAndSendTx([claimRefundIx], [organizer]);
        console.log("Claim refund tx signature(organizer):", claimTxSig);

        const claimerAtaAfter = await getAtaInfo(nomeMint.publicKey, organizer.publicKey);
        assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, amountToClaim);
    });

    it(`Claim refund by sponsor [${MARKS.required}]`, async () => {
        const claimerAtaBefore = await getAtaInfo(assetMint.publicKey, sponsor.publicKey);
        const claimRefundIx = await ixBuilder.claimSponsorRefundIx(sponsor.publicKey, tournamentId);
        const claimTxSig = await buildAndSendTx([claimRefundIx], [sponsor]);
        console.log("Claim refund tx signature(sponsor):", claimTxSig);

        const claimerAtaAfter = await getAtaInfo(assetMint.publicKey, sponsor.publicKey);
        const tournament = await getTournament(tournamentId);
        assert.equal(claimerAtaAfter.amount - claimerAtaBefore.amount, tournament.config.sponsorPool);
    });

    it(`Revoke Role [${MARKS.required}]`, async () => {
        const beforeInfo = await getProvider().connection.getAccountInfo(configPda);
        const beforeLamports = beforeInfo?.lamports ?? 0;

        const roles: [PublicKey, Role][] = [
            [operator.publicKey, { operator: {} }],
            [organizer.publicKey, { organizer: {} }],
            [verifier1.publicKey, { verifier: {} }],
            [verifier2.publicKey, { verifier: {} }],
            [verifier3.publicKey, { verifier: {} }],
        ];

        for (const [userPubkey, roleParams] of roles) {
            const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, userPubkey, roleParams);
            const txSig = await buildAndSendTx([revokeIx], [admin]);
            console.log("Revoke role tx:", txSig);
            const userRole = await getRoleInfo(userPubkey);
            assert.ok(!userRole.roles.some((r) => JSON.stringify(r) === JSON.stringify(roleParams)));
        }


        const afterInfo = await getProvider().connection.getAccountInfo(configPda);
        const afterLamports = afterInfo?.lamports ?? 0;
        assert.notEqual(beforeLamports - afterLamports, 0);
        console.log("Config lamports before revoke:", beforeLamports);
        console.log("Config lamports after revoke:", afterLamports);

        const config = await getSingleConfig();
        assert.deepEqual(config.verifierAddresses, []);
    });

    it(`Revoke Role of a non-existent person [${MARKS.negative}]`, async () => {
        const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, operator.publicKey, { operator: {} });
        try {
            await buildAndSendTx([revokeIx], [admin]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "Role not found");
        }
    });
});
