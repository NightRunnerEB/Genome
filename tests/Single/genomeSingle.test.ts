import { BN, IdlTypes } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import {
    getKeyPairs,
    checkAnchorError,
    sleep,
    createGenomeMint,
    delegateAccount,
    createTournamentMint,
    MARKS,
} from "../utils";
import { IxBuilder } from "../../common/ixBuilder";
import {
    airdropAll,
    getSingleConfig,
    getUserRole,
    getTeam,
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
} from "../../common/utils";
import { GenomeSolana } from "../../target/types/genome_solana";

type TournamentConfig = IdlTypes<GenomeSolana>['tournamentConfig'];
type GenomeSingleConfig = IdlTypes<GenomeSolana>['genomeSingleConfig'];

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
        verifier3: Keypair,
        operator: Keypair,
        captain1: Keypair,
        captain2: Keypair,
        participant1: Keypair,
        participant2: Keypair;

    let assetMint: PublicKey;
    let sponsorAta: PublicKey;
    let organizerAta: PublicKey;
    let platformAta: PublicKey;
    let configPda: PublicKey;

    let tournamentConfigMock: TournamentConfig;
    let configData: GenomeSingleConfig;

    before(async () => {
        ixBuilder = new IxBuilder();
        ({ admin, deployer, platform, token, sponsor, organizer, nome, verifier1, verifier2, verifier3, operator, captain1, captain2, participant1, participant2 } = await getKeyPairs());

        tournamentConfigMock = {
            organizerFee: new BN(100),
            expirationTime: new BN(1748736000), // 1 June 2025
            sponsorPool: new BN(1000),
            sponsor: sponsor.publicKey,
            entryFee: new BN(150),
            teamSize: 2,
            minTeams: 4,
            maxTeams: 10,
            assetMint: token.publicKey,
        };

        configData = {
            tournamentNonce: 0,
            admin: admin.publicKey,
            platformFee: new BN(10),
            verifierFee: new BN(1),
            platformWallet: platform.publicKey,
            nomeMint: nome.publicKey,
            minTeams: 2,
            maxTeams: 20,
            falsePrecision: 0.000065,
            maxOrganizerFee: new BN(5000),
            consensusRate: 60.0,
            verifierAddresses: [],
        };

        await airdropAll(
            [
                admin.publicKey,
                deployer.publicKey,
                sponsor.publicKey,
                organizer.publicKey,
                operator.publicKey,
                verifier1.publicKey,
                verifier2.publicKey,
                captain1.publicKey,
                captain2.publicKey,
                participant1.publicKey,
                participant2.publicKey,
            ],
            10
        );
        configPda = await getGenomePda([GENOME_SINGLE_CONFIG]);
    });

    it(`Create mint [${MARKS.required}]`, async () => {
        ({ assetMint, sponsorAta } = await createTournamentMint());
        ({ organizerAta, platformAta } = await createGenomeMint());
    });

    it(`Delegate [${MARKS.required}]`, async () => {
        let delegate = await delegateAccount(sponsorAta);
        console.log("Initialize delegate tx: ", delegate);
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

    it(`Initialize Genome Solana [${MARKS.required}]`, async () => {
        const initIx = await ixBuilder.initializeSingleIx(
            deployer.publicKey,
            configData
        );
        const initTxSig = await buildAndSendTx([initIx], [deployer]);
        console.log("Initialize Genome tx:", initTxSig);

        const config = await getSingleConfig();
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
            [verifier1.publicKey, { verifier: {} }],
            [verifier2.publicKey, { verifier: {} }],
            [verifier3.publicKey, { verifier: {} }],
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

        const config = await getSingleConfig();
        assert.deepEqual(config.verifierAddresses, [verifier1.publicKey, verifier2.publicKey, verifier3.publicKey]);
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
        const configData = await getSingleConfig();
        const tournamentAccount = await getTournament(configData.tournamentNonce - 1);

        assert.ok(tournamentAccount.status.new);
        assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
        assert.equal(tournamentAccount.teamCount, 0);
        assert.equal(tournamentAccount.organizer.toBase58(), organizer.publicKey.toBase58());
        assert.equal(tournamentAccount.config.sponsorPool.toNumber(), tournamentConfigMock.sponsorPool.toNumber());
        assert.equal(tournamentAccount.config.organizerFee.toNumber(), tournamentConfigMock.organizerFee.toNumber());
        assert.equal(tournamentAccount.config.expirationTime.toNumber(), tournamentConfigMock.expirationTime.toNumber());
        assert.equal(tournamentAccount.config.entryFee.toNumber(), tournamentConfigMock.entryFee.toNumber());
        assert.equal(tournamentAccount.config.assetMint.toBase58(), tournamentConfigMock.assetMint.toBase58());
        assert.equal(tournamentAccount.config.teamSize, tournamentConfigMock.teamSize);
        assert.equal(tournamentAccount.config.minTeams, tournamentConfigMock.minTeams);
        assert.equal(tournamentAccount.config.maxTeams, tournamentConfigMock.maxTeams);

        assert.equal(organizerAtaBefore.amount - organizerAtaAfter.amount, BigInt(configData.platformFee.toNumber()));
        assert.equal(platformAtaAfter.amount - platformAtaBefore.amount, BigInt(configData.platformFee.toNumber()));

        const prizePoolAta = await getPrizePoolAtaInfo(assetMint, tournamentAccount.tournamentPda);
        assert.equal(sponsorAtaBefore.amount - sponsorAtaAfter.amount, prizePoolAta.amount);
    });

    it(`Register tournament - Captain + Teammates [${MARKS.required}]`, async () => {
        const tournamentAccount = await getTournament(0);
        const prizePoolAtaBefore = await getPrizePoolAtaInfo(assetMint, tournamentAccount.tournamentPda);
        const registerParams = {
            tournamentId: 0,
            participant: captain1.publicKey,
            captain: captain1.publicKey,
            teammates: [participant1.publicKey]
        }

        const registerIx = await ixBuilder.registerTournamentIx(registerParams);
        const txSig = await buildAndSendTx([registerIx], [captain1]);
        console.log("Register tournament tx signature:", txSig);

        const teamAccount = await getTeam(0, captain1.publicKey);
        assert.ok(teamAccount, "Team account not created");
        assert.equal(teamAccount.captain.toBase58(), registerParams.captain.toBase58());
        assert.equal(teamAccount.participants.length, registerParams.teammates.length + 1);

        const prizePoolAtaAfter = await getPrizePoolAtaInfo(assetMint, tournamentAccount.tournamentPda);
        const expectedTransfer = tournamentAccount.config.entryFee.toNumber() * (registerParams.teammates.length + 1);
        assert.equal(prizePoolAtaAfter.amount - prizePoolAtaBefore.amount, expectedTransfer);
    });

    it(`Register invalid tournament - Already registered [${MARKS.negative}]`, async () => {
        const registerParams = {
            tournamentId: 0,
            participant: participant1.publicKey,
            captain: captain1.publicKey,
            teammates: []
        }
        try {
            const registerIx = await ixBuilder.registerTournamentIx(registerParams);
            await buildAndSendTx([registerIx], [participant1]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "Participant already registered");
        }
    });

    it(`Register tournament - Additional participant [${MARKS.required}]`, async () => {
        let registerParams = {
            tournamentId: 0,
            participant: captain2.publicKey,
            captain: captain2.publicKey,
            teammates: []
        }

        // Add new team
        let registerIx = await ixBuilder.registerTournamentIx(registerParams);
        let txSig = await buildAndSendTx([registerIx], [captain2]);
        
        // Add additional participant
        registerParams.participant = participant2.publicKey;
        registerIx = await ixBuilder.registerTournamentIx(registerParams);
        txSig = await buildAndSendTx([registerIx], [participant2]);
        console.log("Register additional participant tx signature:", txSig);

        const teamAccount = await getTeam(0, captain2.publicKey);
        assert.ok(teamAccount, "Team account not found");
        assert.equal(teamAccount.participants.length, 2);
        const tournament = await getTournament(0);
        assert.equal(tournament.teamCount, 2);
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

    // it(`Revoke Role [${MARKS.required}]`, async () => {
    //     const beforeInfo = await getProvider().connection.getAccountInfo(configPda);
    //     const beforeLamports = beforeInfo?.lamports ?? 0;

    //     const roles: [PublicKey, Role][] = [
    //         [operator.publicKey, { operator: {} }],
    //         [organizer.publicKey, { organizer: {} }],
    //         [verifier2.publicKey, { verifier: {} }],
    //     ];

    //     for (const [userPubkey, roleParams] of roles) {
    //         const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, userPubkey, roleParams);
    //         const txSig = await buildAndSendTx([revokeIx], [admin]);
    //         console.log("Revoke role tx:", txSig);
    //         const userRole = await getUserRole(userPubkey);
    //         assert.ok(!userRole.some((r) => JSON.stringify(r) === JSON.stringify(roleParams)));
    //     }
    //     const afterInfo = await getProvider().connection.getAccountInfo(configPda);
    //     const afterLamports = afterInfo?.lamports ?? 0;
    //     assert.notEqual(beforeLamports - afterLamports, 0);
    //     console.log("Config lamports before revoke:", beforeLamports);
    //     console.log("Config lamports after revoke:", afterLamports);

    //     const config = await getSingleConfig();
    //     assert.deepEqual(config.verifierAddresses, []);
    // });

    // it(`Revoke Role of a non-existent person [${MARKS.negative}]`, async () => {
    //     const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, operator.publicKey, { operator: {} });
    //     try {
    //         await buildAndSendTx([revokeIx], [admin]);
    //         throw new Error("Expected error was not thrown");
    //     } catch (error) {
    //         checkAnchorError(error, "Role not found");
    //     }
    // });

    it(`Set Bloom Precision with valid value [${MARKS.required}]`, async () => {
        const newPrecision = 0.05;

        const setBloomIx = await ixBuilder.setBloomPrecisionIx(admin.publicKey, newPrecision);
        const txSig = await buildAndSendTx([setBloomIx], [admin]);
        console.log("Set Bloom Precision tx signature:", txSig);

        const config = await getSingleConfig();
        assert.equal(config.falsePrecision, newPrecision);
    });

    it(`Set Bloom Precision with invalid value [${MARKS.negative}]`, async () => {
        const newPrecision = 0;
        const setBloomIx = await ixBuilder.setBloomPrecisionIx(admin.publicKey, newPrecision);
        try {
            await buildAndSendTx([setBloomIx], [admin]);
            throw new Error("Expected error was not thrown");
        } catch (error) {
            checkAnchorError(error, "InvalidPrecision");
        }
    });
});
