import * as assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TxBuilder } from "./txBuilder";
import {
    airdrop,
    getKeyPairs,
    createGenomeMint,
    delegateAccount,
    createInvalidTournament,
    getPrizePoolAta,
    getSponsorAta
} from "./utils";

describe("Genome Solana Singlechain", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const { admin, organizer, sponsor, token, captain, participant1, participant2, participant3 } = getKeyPairs();
    let mint: PublicKey;
    let sponsorAta: PublicKey;
    const txBuilder = new TxBuilder();

    const tournamentDataMock = {
        organizer: organizer.publicKey,
        sponsor: sponsor.publicKey,
        organizerFee: new anchor.BN(100),
        sponsorPool: new anchor.BN(1000),
        expirationTime: new anchor.BN(Math.floor(Date.now() / 1000)),
        entryFee: new anchor.BN(20),
        teamSize: 10,
        minTeams: 4,
        maxTeams: 10,
        assetMint: token.publicKey,
    };
    
    const configData = {
        admin: admin.publicKey,
        platformWallet: admin.publicKey,
        platformFee: new anchor.BN(10),
        minEntryFee: new anchor.BN(10),
        minSponsorPool: new anchor.BN(500),
        maxOrganizerFee: new anchor.BN(5000),
        tournamentNonce: 0,
        minTeams: 2,
        maxTeams: 20,
        consensusRate: new anchor.BN(60),
        falsePrecision: new anchor.BN(Math.floor(0.000065 * 1_000_000_000)),
    };
    

    const registerParams1 = {
        tournamentId: 0,
        participant: captain.publicKey,
        captain: captain.publicKey,
        teammates: [participant1.publicKey, participant2.publicKey]
    }

    const registerParams2 = {
        tournamentId: 0,
        participant: participant1.publicKey,
        captain: captain.publicKey,
        teammates: []
    }

    const registerParams3 = {
        tournamentId: 0,
        participant: participant3.publicKey,
        captain: captain.publicKey,
        teammates: []
    }

    before(async () => {
        await Promise.all(
            [admin, organizer, sponsor, captain, participant1, participant2, participant3].map(
                async (keypair) => await airdrop(keypair.publicKey, 100)
            )
        );
    });

    it("Create mint", async () => {
        ({ mint, sponsorAta } = await createGenomeMint());
    });

    it("Delegate", async () => {
        let delegate = await delegateAccount(sponsorAta);
        console.log("Initialize delegate tx: ", delegate);
    });

    it("Initialize Genome Solana", async () => {
        let tx = await txBuilder.initialize(admin, configData);
        console.log("Initialize Genome tx: ", tx);

        const configAccount = await txBuilder.getConfig();
        assert.ok(configAccount != null);
        assert.equal(configAccount.admin.toBase58(), configData.admin.toBase58());
        assert.equal(configAccount.platformWallet.toBase58(), configData.platformWallet.toBase58());
        assert.equal(configAccount.falsePrecision.toNumber(), configData.falsePrecision.toNumber());
        assert.equal(configAccount.platformFee.toNumber(), configData.platformFee.toNumber());
        assert.equal(configAccount.minEntryFee.toNumber(), configData.minEntryFee.toNumber());
        assert.equal(configAccount.minSponsorPool.toNumber(), configData.minSponsorPool.toNumber());
        assert.equal(configAccount.maxOrganizerFee.toNumber(), configData.maxOrganizerFee.toNumber());
        assert.equal(configAccount.tournamentNonce, configData.tournamentNonce);
        assert.equal(configAccount.minTeams, configData.minTeams);
        assert.equal(configAccount.maxTeams, configData.maxTeams);
    });

    it("Create a Tournament", async () => {
        const sponsorAtaBefore = await getSponsorAta(sponsorAta);
        let tx = await txBuilder.createTournamentSinglechain(organizer, sponsor, mint, tournamentDataMock)
        console.log("Initialize createTournament tx: ", tx);

        const sponsorAtaAfter = await getSponsorAta(sponsorAta);
        const configData = await txBuilder.getConfig();
        const tournamentAccount = await txBuilder.getTournament(configData.tournamentNonce - 1);

        assert.ok(tournamentAccount != null);
        assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
        assert.equal(tournamentAccount.sponsor.toBase58(), tournamentDataMock.sponsor.toBase58());
        assert.equal(tournamentAccount.sponsorPool.toNumber(), tournamentDataMock.sponsorPool.toNumber());
        assert.equal(tournamentAccount.organizerFee.toNumber(), tournamentDataMock.organizerFee.toNumber());
        assert.equal(tournamentAccount.entryFee.toNumber(), tournamentDataMock.entryFee.toNumber());
        assert.ok(tournamentAccount.status.new);
        assert.equal(tournamentAccount.teamSize, tournamentDataMock.teamSize);
        assert.equal(tournamentAccount.minTeams, tournamentDataMock.minTeams);
        assert.equal(tournamentAccount.maxTeams, tournamentDataMock.maxTeams);
        assert.equal(tournamentAccount.organizer.toBase58(), tournamentDataMock.organizer.toBase58());
        assert.equal(tournamentAccount.assetMint.toBase58(), tournamentDataMock.assetMint.toBase58());


        const prizePoolAta = await getPrizePoolAta(mint, tournamentAccount.tournamentPda);
        assert.equal(sponsorAtaBefore.amount - sponsorAtaAfter.amount, prizePoolAta.amount);
    });

    it("Register tournament 1", async () => {
        await txBuilder.registerTournament(captain, mint, registerParams1)

        const configData = await txBuilder.getConfig();
        const teamAccount = await txBuilder.getTeam(0, captain.publicKey);
        console.log("Team account: " + teamAccount);
    });

    it("Register invalid tournament 2", async () => {
        try {
            await txBuilder.registerTournament(participant1, mint, registerParams2)
        } catch(err) {
            assert.match(err.toString(), /AlreadyRegistered/);
        }

        const configData = await txBuilder.getConfig();
        const teamAccount = await txBuilder.getTeam(0, captain.publicKey);
        console.log("Team account: " + teamAccount);
    });

    it("Register tournament 3", async () => {
        await txBuilder.registerTournament(participant3, mint, registerParams3)

        const configData = await txBuilder.getConfig();
        const teamAccount = await txBuilder.getTeam(0, captain.publicKey);
        console.log("Team account: " + teamAccount);
    });

    it("Invalid organizer fee", async () => {
        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, organizerFee: new anchor.BN(9999999) },
            /InvalidOrganizerFee/
        );
    });

    it("Invalid entry_fee", async () => {
        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, entryFee: new anchor.BN(1) },
            /InvalidAdmissionFee/
        );
    });

    it("Invalid team limit (minTeams, maxTeams)", async () => {
        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, maxTeams: 100 },
            /InvalidTeamsCount/
        );

        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, minTeams: 0 },
            /InvalidTeamsCount/
        );
    });

    it("Invalid prize_pool param", async () => {
        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, sponsorPool: new anchor.BN(10) },
            /InvalidSponsorPool/
        );
    });

    it("Invalid tournament capacity", async () => {
        await createInvalidTournament(
            txBuilder,
            { ...tournamentDataMock, maxTeams: 100, teamSize: 40 },
            /MaxPlayersExceeded/
        );
    });
});
