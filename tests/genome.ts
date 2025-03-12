import * as assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TxBuilder } from "./txBuilder";
import {
    airdrop,
    getKeyPairs,
    createGenomeMint,
    delegateAccount
} from "./utils";

describe("Genome Solana Singlechain", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const { admin, organizer, sponsor, token } = getKeyPairs();
    let mint: PublicKey;
    let sponsorAta: PublicKey;
    const txBuilder = new TxBuilder();

    const tournamentDataMock = {
        organizer: organizer.publicKey,
        sponsor: sponsor.publicKey,
        organizerRoyalty: new anchor.BN(100),
        sponsorPool: new anchor.BN(1000),
        entryFee: new anchor.BN(20),
        teamSize: 10,
        minTeams: 4,
        maxTeams: 10,
        token: token.publicKey,
    };

    const configData = {
        admin: admin.publicKey,
        tournamentNonce: 0,
        platformFee: new anchor.BN(10),
        platformWallet: admin.publicKey,
        minEntryFee: new anchor.BN(10),
        minSponsorPool: new anchor.BN(500),
        minTeams: 2,
        maxTeams: 20,
        falsePrecision: 0.000065,
        maxOrganizerRoyalty: new anchor.BN(5000),
        mint: token.publicKey,
    };

    const createTournamentAndExpectError = async (
        overrideParams: Partial<typeof tournamentDataMock>,
        expectedRegex: RegExp
    ) => {
        const invalidData = { ...tournamentDataMock, ...overrideParams };
        try {
            await txBuilder.createTournamentSinglechain(organizer, sponsor, mint, invalidData);
            assert.fail("An error was expected, but the transaction was successful");
        } catch (err: any) {
            assert.match(err.toString(), expectedRegex);
        }
    };

    before(async () => {
        await Promise.all(
            [admin, organizer, sponsor].map(
                async (keypair) => await airdrop(keypair.publicKey, 10)
            )
        );
    });

    it("Create mint", async () => {
        ({ mint, sponsorAta } = await createGenomeMint());
    });

    it("Delegate", async () => {
        let delegate = await delegateAccount(sponsorAta);
        console.log("Initialize delegate: ", delegate);
    });

    it("Initialize Genome Solana", async () => {
        let tx = await txBuilder.initialize(admin, configData);
        console.log("Initialize genom tx: ", tx);

        const configAccount = await txBuilder.getConfig();
        assert.ok(configAccount != null);
        assert.equal(configAccount.minEntryFee, 10);
        assert.equal(configAccount.minSponsorPool.toNumber(), 500);
    });

    it("Create a Tournament", async () => {
        await txBuilder.createTournamentSinglechain(organizer, sponsor, mint, tournamentDataMock)

        const configData = await txBuilder.getConfig();
        const tournamentAccount = await txBuilder.getTournament(configData.tournamentNonce - 1);

        assert.ok(tournamentAccount != null);
        assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
        assert.equal(tournamentAccount.sponsor.toBase58(), tournamentDataMock.sponsor.toBase58());
        assert.equal(tournamentAccount.sponsorPool.toNumber(), tournamentDataMock.sponsorPool.toNumber());
        assert.equal(tournamentAccount.organizerRoyalty.toNumber(), tournamentDataMock.organizerRoyalty.toNumber());
        assert.equal(tournamentAccount.entryFee.toNumber(), tournamentDataMock.entryFee.toNumber());
        assert.equal(tournamentAccount.status, 0);
        assert.equal(tournamentAccount.teamSize, tournamentDataMock.teamSize);
        assert.equal(tournamentAccount.minTeams, tournamentDataMock.minTeams);
        assert.equal(tournamentAccount.maxTeams, tournamentDataMock.maxTeams);
        assert.equal(tournamentAccount.organizer.toBase58(), tournamentDataMock.organizer.toBase58());
        assert.equal(tournamentAccount.token.toBase58(), tournamentDataMock.token.toBase58());
    });

    it("Invalid organizerRoyalty", async () => {
        await createTournamentAndExpectError(
            { organizerRoyalty: new anchor.BN(9999999) },
            /InvalidRoyalty|custom program error/
        );
    });

    it("Invalid entry_fee", async () => {
        await createTournamentAndExpectError(
            { entryFee: new anchor.BN(1) },
            /InvalidAdmissionFee|custom program error/
        );
    });

    it("Invalid team limit (minTeams, maxTeams)", async () => {
        await createTournamentAndExpectError(
            { maxTeams: 100 },
            /InvalidTeamsCount|custom program error/
        );

        await createTournamentAndExpectError(
            { minTeams: 0 },
            /InvalidTeamsCount|custom program error/
        );
    });

    it("Invalid prize_pool param", async () => {
        await createTournamentAndExpectError(
            { sponsorPool: new anchor.BN(10) },
            /InvalidPrizePool|custom program error/
        );
    });

    it("Invalid tournament capacity", async () => {
        await createTournamentAndExpectError(
            { maxTeams: 100, teamSize: 40 },
            /MaxPlayersExceeded|custom program error/
        );
    });
});
