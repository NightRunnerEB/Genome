import { BN, IdlTypes } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import {
    getKeyPairs,
    getUserRole,
    checkAnchorError,
    sleep,
    createGenomeMint,
    delegateAccount,
    createTournamentMint,
    TournamentConfig,
    GenomeSingleConfig,
    MARKS,
} from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import {
    airdropAll,
    getConfig,
    buildAndSendTx,
    getTokenInfo,
    getTournament,
    Role,
    getProvider,
    getSponsorAtaInfo,
    getPrizePoolAtaInfo,
    getOrganizerAtaInfo,
    getGenomePda,
    GENOME_SINGLE_CONFIG,
} from "../common/utils";
import { GenomeSolana } from "../target/types/genome_solana";

describe("Genome Solana Singlechain", () => {
    let ixBuilder: IxBuilder;
    let admin: Keypair,
        deployer: Keypair,
        platform: Keypair,
        token: Keypair,
        sponsor: Keypair,
        organizer: Keypair,
        nome: Keypair,
        verifier1: Keypair,
        verifier2: Keypair,
        operator: Keypair;

    let assetMint: PublicKey;
    let sponsorAta: PublicKey;
    let organizerAta: PublicKey;
    let platformAta: PublicKey;
    let configPda: PublicKey;

    let tournamentConfigMock: TournamentConfig;
    let configData: GenomeSingleConfig;

    before(async () => {
        ixBuilder = new IxBuilder();
        ({ admin, deployer, platform, token, sponsor, organizer, nome, verifier1, verifier2, operator } = await getKeyPairs());

        tournamentConfigMock = {
            organizer: organizer.publicKey,
            organizerFee: new BN(100),
            expirationTime: new BN(1748736000), // 1 June 2025
            sponsorPool: new BN(1000),
            entryFee: new BN(150),
            teamSize: 10,
            minTeams: 4,
            maxTeams: 10,
            assetMint: token.publicKey,
        };

        configData = {
            admin: admin.publicKey,
            platformFee: new BN(10),
            platformWallet: platform.publicKey,
            nomeMint: nome.publicKey,
            minTeams: 2,
            maxTeams: 20,
            falsePrecision: 0.000065,
            maxOrganizerFee: new BN(5000),
            consensusRate: 66.0,
            verifierAddresses: [],
        };

        await airdropAll(
            [
                admin.publicKey,
                deployer.publicKey,
                organizer.publicKey,
                operator.publicKey,
                verifier1.publicKey,
                verifier2.publicKey,
            ],
            10
        );
        configPda = await getGenomePda([GENOME_SINGLE_CONFIG]);
    });

    it(`Initialize Genome Solana with Invalid Params [${MARKS.negative}]`, async () => {
        try {
            const configDataInvalid = {
                ...configData,
                verifierAddresses: [
                    ...configData.verifierAddresses,
                    verifier1.publicKey,
                    verifier2.publicKey,
                ],
            };
            const initIx = await ixBuilder.initializeSingleIx(
                deployer.publicKey,
                configDataInvalid
            );
            await buildAndSendTx([initIx], [deployer]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "The list of verifiers must be empty");
        }
    });

    it(`Create mint [${MARKS.required}]`, async () => {
        ({ assetMint, sponsorAta } = await createTournamentMint());
        ({ organizerAta, platformAta } = await createGenomeMint());
    });

    it(`Delegate [${MARKS.required}]`, async () => {
        let delegate = await delegateAccount(sponsorAta);
        console.log("Initialize delegate tx: ", delegate);
    });

    it(`Initialize Genome Solana [${MARKS.required}]`, async () => {
        const initIx = await ixBuilder.initializeSingleIx(
            deployer.publicKey,
            configData
        );
        const initTxSig = await buildAndSendTx([initIx], [deployer]);
        console.log("Initialize Genome tx:", initTxSig);

        const config = await getConfig();
        assert.equal(config.tournamentNonce, 0);
        assert.deepEqual(config.admin, configData.admin);
        assert.deepEqual(config.platformWallet, configData.platformWallet);
        assert.equal(config.falsePrecision, configData.falsePrecision);
        assert.equal(config.platformFee.toNumber(), configData.platformFee.toNumber());
        assert.equal(config.maxOrganizerFee.toNumber(), configData.maxOrganizerFee.toNumber());
        assert.equal(config.minTeams, configData.minTeams);
        assert.equal(config.maxTeams, configData.maxTeams);
        assert.deepEqual(config.nomeMint, configData.nomeMint);
        assert.equal(config.consensusRate, configData.consensusRate);
        assert.deepEqual(config.verifierAddresses, configData.verifierAddresses);
    });

    it(`Grant Role by non-admin [${MARKS.negative}]`, async () => {
        const grantRoleIx = await ixBuilder.grantRoleIx(
            operator.publicKey,
            organizer.publicKey,
            { organizer: {} }
        );
        try {
            await buildAndSendTx([grantRoleIx], [operator]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "Not Allowed");
        }
    });

    it(`Grant role [${MARKS.required}]`, async () => {
        const beforeInfo = await getProvider().connection.getAccountInfo(configPda);
        const beforeLamports = beforeInfo?.lamports ?? 0;

        const roles: [PublicKey, IdlTypes<GenomeSolana>["role"]][] = [
            [operator.publicKey, { operator: {} }],
            [organizer.publicKey, { organizer: {} }],
            [verifier2.publicKey, { verifier: {} }],
        ];

        for (const [userPubkey, roleParams] of roles) {
            const grantIx = await ixBuilder.grantRoleIx(
                admin.publicKey,
                userPubkey,
                roleParams
            );
            const txSig = await buildAndSendTx([grantIx], [admin]);
            console.log("Grant role tx signature:", txSig);

            const userRole = await getUserRole(userPubkey);
            assert.deepEqual(userRole[0], roleParams);
        }

        const afterInfo = await getProvider().connection.getAccountInfo(configPda);
        const afterLamports = afterInfo?.lamports ?? 0;
        assert.notEqual(beforeLamports - afterLamports, 0);
        console.log("Config lamports before grant:", beforeLamports);
        console.log("Config lamports after grant:", afterLamports);

        const config = await getConfig();
        assert.deepEqual(config.verifierAddresses, [verifier2.publicKey]);
    });

    it(`Give the role to the same person again [${MARKS.negative}]`, async () => {
        await sleep(4000);
        const grantIx = await ixBuilder.grantRoleIx(
            admin.publicKey,
            verifier2.publicKey,
            { verifier: {} }
        );
        try {
            await buildAndSendTx([grantIx], [admin]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "Role already granted.");
        }
    });

    it(`Approve Token [${MARKS.required}]`, async () => {
        const minSponsorPool = new BN(1000);
        const minEntryPool = new BN(100);
        let approveTokenIx = await ixBuilder.approveTokenIx(
            operator.publicKey,
            token.publicKey,
            minSponsorPool,
            minEntryPool
        );
        const txSig = await buildAndSendTx([approveTokenIx], [operator]);
        console.log("Approve Token tx:", txSig);

        const tokenInfo = await getTokenInfo(token.publicKey);
        assert.deepEqual(tokenInfo.assetMint, token.publicKey);
        assert.equal(tokenInfo.minEntryFee.toNumber(), minEntryPool.toNumber());
        assert.equal(tokenInfo.minSponsorPool.toNumber(), minSponsorPool.toNumber());
    });

    it(`Ban Token [${MARKS.required}]`, async () => {
        const banTokenIx = await ixBuilder.banTokenIx(
            operator.publicKey,
            token.publicKey
        );
        const txSig = await buildAndSendTx([banTokenIx], [operator]);
        console.log("Ban Token tx:", txSig);
        try {
            await getTokenInfo(token.publicKey);
        } catch (error) {
            checkAnchorError(error, "Account does not exist");
        }
    });

    it(`Create a Tournament with banned token [${MARKS.negative}]`, async () => {
        try {
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                token.publicKey,
                tournamentConfigMock
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "expected this account to be already initialized");
        }
    });

    it(`Create a Tournament with approved token [${MARKS.required}]`, async () => {
        // Approve token first
        const minSponsorPool = new BN(1000);
        const minEntryFee = new BN(100);
        let ix = await ixBuilder.approveTokenIx(
            operator.publicKey,
            token.publicKey,
            minSponsorPool,
            minEntryFee
        );
        let txSig = await buildAndSendTx([ix], [operator]);
        console.log("Approve token tx signature:", txSig);

        const sponsorAtaBefore = await getSponsorAtaInfo(sponsorAta);
        const organizerAtaBefore = await getOrganizerAtaInfo(organizerAta);
        const platformAtaBefore = await getOrganizerAtaInfo(platformAta);

        ix = await ixBuilder.createTournamentIx(
            organizer.publicKey,
            sponsor.publicKey,
            assetMint,
            tournamentConfigMock
        );
        txSig = await buildAndSendTx([ix], [organizer]);
        console.log("Create Tournament tx signature:", txSig);

        const sponsorAtaAfter = await getSponsorAtaInfo(sponsorAta);
        const organizerAtaAfter = await getOrganizerAtaInfo(organizerAta);
        const platformAtaAfter = await getOrganizerAtaInfo(platformAta);
        const configData = await getConfig();
        const tournamentAccount = await getTournament(configData.tournamentNonce - 1);

        assert.ok(tournamentAccount.status.new);
        assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
        assert.equal(tournamentAccount.teamCount, 0);
        assert.equal(tournamentAccount.config.sponsorPool.toNumber(), tournamentConfigMock.sponsorPool.toNumber());
        assert.equal(tournamentAccount.config.organizerFee.toNumber(), tournamentConfigMock.organizerFee.toNumber());
        assert.equal(tournamentAccount.config.expirationTime.toNumber(), tournamentConfigMock.expirationTime.toNumber());
        assert.equal(tournamentAccount.config.entryFee.toNumber(), tournamentConfigMock.entryFee.toNumber());
        assert.equal(tournamentAccount.config.organizer.toBase58(), tournamentConfigMock.organizer.toBase58());
        assert.equal(tournamentAccount.config.assetMint.toBase58(), tournamentConfigMock.assetMint.toBase58());
        assert.equal(tournamentAccount.config.teamSize, tournamentConfigMock.teamSize);
        assert.equal(tournamentAccount.config.minTeams, tournamentConfigMock.minTeams);
        assert.equal(tournamentAccount.config.maxTeams, tournamentConfigMock.maxTeams);

        assert.equal(organizerAtaBefore.amount - organizerAtaAfter.amount, BigInt(configData.platformFee.toNumber()));
        assert.equal(platformAtaAfter.amount - platformAtaBefore.amount, BigInt(configData.platformFee.toNumber()));

        const prizePoolAta = await getPrizePoolAtaInfo(assetMint, tournamentAccount.tournamentPda);
        assert.equal(sponsorAtaBefore.amount - sponsorAtaAfter.amount, prizePoolAta.amount);
    });

    it(`Create a Tournament by a non-organizer [${MARKS.negative}]`, async () => {
        try {
            const ix = await ixBuilder.createTournamentIx(
                operator.publicKey,
                sponsor.publicKey,
                assetMint,
                tournamentConfigMock
            );
            await buildAndSendTx([ix], [operator]);
        } catch (error) {
            checkAnchorError(error, "Not Allowed");
        }
    });

    it(`Invalid organizer fee [${MARKS.negative}]`, async () => {
        try {
            const invalidData = { ...tournamentConfigMock, organizerFee: new BN(9999999) };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Invalid organizer fee");
        }
    });

    it(`Invalid entry fee [${MARKS.negative}]`, async () => {
        try {
            const invalidData = { ...tournamentConfigMock, entryFee: new BN(1) };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Invalid entry fee");
        }
    });

    it(`Invalid team limit (minTeams, maxTeams) [${MARKS.negative}]`, async () => {
        try {
            const invalidData = { ...tournamentConfigMock, maxTeams: 100 };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Invalid teams count");
        }

        try {
            const invalidData = { ...tournamentConfigMock, minTeams: 0 };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Invalid teams count");
        }
    });

    it(`Invalid prize_pool [${MARKS.negative}]`, async () => {
        try {
            const invalidData = { ...tournamentConfigMock, sponsorPool: new BN(10) };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Invalid sponsor pool");
        }
    });

    it(`Invalid tournament capacity [${MARKS.negative}]`, async () => {
        try {
            const invalidData = { ...tournamentConfigMock, maxTeams: 100, teamSize: 40 };
            const ix = await ixBuilder.createTournamentIx(
                organizer.publicKey,
                sponsor.publicKey,
                assetMint,
                invalidData
            );
            await buildAndSendTx([ix], [organizer]);
        } catch (error) {
            checkAnchorError(error, "Max players exceeded");
        }
    });

    it(`Revoke Role [${MARKS.required}]`, async () => {
        const beforeInfo = await getProvider().connection.getAccountInfo(configPda);
        const beforeLamports = beforeInfo?.lamports ?? 0;

        const roles: [PublicKey, Role][] = [
            [operator.publicKey, { operator: {} }],
            [organizer.publicKey, { organizer: {} }],
            [verifier2.publicKey, { verifier: {} }],
        ];

        for (const [userPubkey, roleParams] of roles) {
            const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, userPubkey, roleParams);
            const txSig = await buildAndSendTx([revokeIx], [admin]);
            console.log("Revoke role tx:", txSig);
            const userRole = await getUserRole(userPubkey);
            assert.ok(!userRole.some((r) => JSON.stringify(r) === JSON.stringify(roleParams)));
        }
        const afterInfo = await getProvider().connection.getAccountInfo(configPda);
        const afterLamports = afterInfo?.lamports ?? 0;
        assert.notEqual(beforeLamports - afterLamports, 0);
        console.log("Config lamports before revoke:", beforeLamports);
        console.log("Config lamports after revoke:", afterLamports);

        const config = await getConfig();
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

    it(`Grant 128 random Verifier roles [${MARKS.required}]`, async () => {
        const randomVerifiers = Array.from({ length: 128 }, () => Keypair.generate());

        const grantRolePromises = randomVerifiers.map(async (verifier) => {
            const grantRoleIx = await ixBuilder.grantRoleIx(
                admin.publicKey,
                verifier.publicKey,
                { verifier: {} }
            );
            const txSig = await buildAndSendTx([grantRoleIx], [admin]);
            const userRole = await getUserRole(verifier.publicKey);
            assert.deepEqual(userRole[0], { verifier: {} });
        });

        await Promise.all(grantRolePromises);

        const config = await getConfig();
        console.log("Total verifiers stored in contract:", config.verifierAddresses.length);
        assert.equal(config.verifierAddresses.length, 128, "Expected 128 verifier addresses in config");

        randomVerifiers.forEach((verifier) => {
            const found = config.verifierAddresses.some((addr) =>
                addr.equals(verifier.publicKey)
            );
            assert.ok(found, `Verifier pubkey ${verifier.publicKey.toBase58()} not found in config`);
        });
    });
});
