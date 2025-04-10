import { BN, IdlTypes } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import {
    getKeyPairs,
    checkAnchorError,
    sleep,
    MARKS,
    createGenomeMint,
} from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import {
    airdropAll,
    getSingleConfig,
    getUserRole,
    buildAndSendTx,
    Role,
    GenomeSingleConfig,
    getProvider,
    getGenomePda,
    GENOME_SINGLE_CONFIG,
} from "../common/utils";
import { GenomeSolana } from "../target/types/genome_solana";

describe("Genome Solana Singlechain", () => {
    let ixBuilder: IxBuilder;
    let admin: Keypair,
        deployer: Keypair,
        organizer: Keypair,
        nome: Keypair,
        verifier1: Keypair,
        verifier2: Keypair,
        operator: Keypair;

    let configPda: PublicKey;

    let configData: GenomeSingleConfig;

    before(async () => {
        ixBuilder = new IxBuilder();
        ({ admin, deployer, organizer, nome, verifier1, verifier2, operator } = await getKeyPairs());

        configData = {
            admin: admin.publicKey,
            platformFee: new BN(10),
            verifierFee: new BN(10),
            tournamentNonce: 0,
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

    it(`Create mint [${MARKS.required}]`, async () => {
        await createGenomeMint();
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
        assert.equal(config.falsePrecision, configData.falsePrecision);
        assert.equal(config.platformFee.toNumber(), configData.platformFee.toNumber());
        assert.equal(config.verifierFee.toNumber(), configData.verifierFee.toNumber());
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
            checkAnchorError(error, "Not allowed");
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

        const config = await getSingleConfig();
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
