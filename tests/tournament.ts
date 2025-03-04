import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { getAdminKeyPairs } from "./utits";

describe("Genome Contract Tests (initialize & createTournament)", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.GenomeContract as Program<GenomeContract>;
    const adminKeypair = getAdminKeyPairs().admin;
    const organizerKeypair = Keypair.generate();
    let mintPubkey: PublicKey;
    let sponsorAtaPubkey: PublicKey;

    const configPda = PublicKey.findProgramAddressSync(
        [Buffer.from("genome"), Buffer.from("config")],
        program.programId
    )[0];

    before(async () => {
        const sigAdmin = await provider.connection.requestAirdrop(
            adminKeypair.publicKey,
            3 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sigAdmin);
        const sigOrg = await provider.connection.requestAirdrop(
            organizerKeypair.publicKey,
            3 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sigOrg);
        mintPubkey = await createMint(
            provider.connection,
            adminKeypair,
            adminKeypair.publicKey,
            null,
            6
        );
        const sponsorAta = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            adminKeypair,
            mintPubkey,
            organizerKeypair.publicKey
        );
        sponsorAtaPubkey = sponsorAta.address;
        await mintTo(
            provider.connection,
            adminKeypair,
            mintPubkey,
            sponsorAtaPubkey,
            adminKeypair,
            100000000
        );
    });

    it("Initialize GenomeConfig", async () => {
        const configData = {
            admin: adminKeypair.publicKey,
            tournamentNonce: 0,
            platformFee: new anchor.BN(10),
            platformWallet: adminKeypair.publicKey,
            minEntryFee: new anchor.BN(10),
            minSponsorPool: new anchor.BN(500),
            maxSponsorFee: new anchor.BN(1000),
            minTeams: 2,
            maxTeams: 20,
            maxOrganizerRoyalty: new anchor.BN(5000),
            mint: mintPubkey,
        };

        await program.methods
            .initialize(configData)
            .accounts({
                admin: adminKeypair.publicKey,
                config: configPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([adminKeypair])
            .rpc();

        const configAccount = await program.account.genomeConfig.fetch(configPda);
        assert.ok(configAccount != null);
        assert.equal(configAccount.minEntryFee.toNumber(), 10);
        assert.equal(configAccount.minSponsorPool.toNumber(), 500);
    });

    it("Create a Tournament", async () => {
        const configDataBefore = await program.account.genomeConfig.fetch(configPda);
        const tournamentNonce = configDataBefore.tournamentNonce;
        const [tournamentPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("genome"),
                Buffer.from("tournament"),
                new Uint8Array(new Uint32Array([tournamentNonce]).buffer),
            ],
            program.programId
        );
        const [bloomPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("genome"), Buffer.from("bloom")],
            program.programId
        );

        const tournamentData = {
            organizerWallet: organizerKeypair.publicKey,
            sponsorWallet: organizerKeypair.publicKey,
            sponsorPool: new anchor.BN(1000),
            organizerRoyalty: new anchor.BN(100),
            sponsorFee: new anchor.BN(100),
            entryFee: new anchor.BN(20),
            registrationStart: new anchor.BN(12345678),
            participantPerTeam: 10,
            minTeams: 4,
            maxTeams: 20,
            token: mintPubkey,
        };

        try {
            await program.methods
                .createTournament(tournamentData)
                .accounts({
                    organizer: organizerKeypair.publicKey,
                    mint: mintPubkey,
                    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                })
                .signers([organizerKeypair])
                .rpc();

            const configDataAfter = await program.account.genomeConfig.fetch(configPda);
            const tournamentAccount = await program.account.tournament.fetch(tournamentPda);
            assert.ok(tournamentAccount != null);
            assert.equal(tournamentAccount.id, configDataAfter.tournamentNonce);
            assert.equal(
                tournamentAccount.sponsorWallet.toBase58(),
                tournamentData.sponsorWallet.toBase58(),
            );
            assert.equal(
                tournamentAccount.sponsorPool.toNumber(),
                tournamentData.sponsorPool.toNumber(),
            );
            assert.equal(
                tournamentAccount.entryFee.toNumber(),
                tournamentData.entryFee.toNumber(),
            );
            assert.equal(
                tournamentAccount.registrationStart.toNumber(),
                tournamentData.registrationStart.toNumber(),
            );
            assert.equal(
                tournamentAccount.participantPerTeam,
                tournamentData.participantPerTeam,
            );
            assert.equal(
                tournamentAccount.minTeams,
                tournamentData.minTeams,
            );
            assert.equal(
                tournamentAccount.maxTeams,
                tournamentData.maxTeams,
            );
        } catch (err) {
            console.error(err.error);
            throw err
        }
    });

    it("Invalid tournament params", async () => {
        const configData = await program.account.genomeConfig.fetch(configPda);
        const sponsorPoolTooSmall = new anchor.BN(10);
        const tournamentDataInvalid = {
            organizerWallet: organizerKeypair.publicKey,
            sponsorWallet: organizerKeypair.publicKey,
            sponsorPool: sponsorPoolTooSmall,
            organizerRoyalty: new anchor.BN(50),
            sponsorFee: new anchor.BN(100),
            entryFee: new anchor.BN(30),
            registrationStart: new anchor.BN(Math.floor(Date.now() / 1000) + 60),
            participantPerTeam: 5,
            minTeams: 3,
            maxTeams: 10,
            token: mintPubkey,
        };
        const [tournamentPda2] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("genome"),
                Buffer.from("tournament"),
                new Uint8Array(new Uint32Array([configData.tournamentNonce]).buffer),
            ],
            program.programId
        );
        const [bloomPda2] = PublicKey.findProgramAddressSync(
            [Buffer.from("genome"), Buffer.from("bloom")],
            program.programId
        );
        const bloomFilterAccount = await program.account.bloomFilterAccount.fetch(bloomPda2);
        console.log("Bloom:", bloomFilterAccount.data.length);

        let threwError = false;
        try {
            await program.methods
                .createTournament(tournamentDataInvalid)
                .accounts({
                    organizer: organizerKeypair.publicKey,
                    mint: mintPubkey,
                    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                })
                .signers([organizerKeypair])
                .rpc();
        } catch (err: any) {
            threwError = true;
            assert.match(err.toString(), /InvalidSponsorPool|custom program error/);
        }
        assert.ok(threwError);
    });
});
