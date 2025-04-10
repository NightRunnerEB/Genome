import {
    Program,
    BN,
    workspace,
    AnchorProvider,
    setProvider,
    IdlTypes,
} from "@coral-xyz/anchor";
import {
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { GenomeSolana } from "../target/types/genome_solana";
import { getKeypairFromFile } from "@solana-developers/helpers";

const PROGRAM = getProgram();
export const GENOME_OMNI_CONFIG = getConstant("omniConfig");
export const GENOME_SINGLE_CONFIG = getConstant("singleConfig");
const GENOME_PROGRAM_PATH = "./keys/genome-program.json";
const GENOME_ROOT = getConstant("genomeRoot");
const ROLE = getConstant("role");

export type Role = IdlTypes<GenomeSolana>["role"];
export type GenomeSingleConfig = IdlTypes<GenomeSolana>['genomeSingleConfig'];

/**
 * Make object pretty for logging
 * @param obj Input object which should be prettified
 * @returns Well formatted string
 */
export function prettify(obj: any): string {
    let prettyObj: any = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const targetType = typeof obj[key];
            if (obj[key] instanceof BN) {
                prettyObj[key] = obj[key].toNumber();
            } else {
                prettyObj[key] = obj[key];
            }
        }
    }

    return JSON.stringify(prettyObj, null, 2);
}

export async function getSingleConfig() {
    const configPda = await getGenomePda([GENOME_SINGLE_CONFIG]);
    const config = await PROGRAM.account.genomeSingleConfig.fetch(configPda);
    return {
        admin: config.admin,
        verifierAddresses: config.verifierAddresses,
        consensusRate: config.consensusRate,
        tournamentNonce: config.tournamentNonce,
        platformFee: config.platformFee,
        verifierFee: config.verifierFee,
        falsePrecision: config.falsePrecision,
        minTeams: config.minTeams,
        maxTeams: config.maxTeams,
        maxOrganizerFee: config.maxOrganizerFee,
        nomeMint: config.nomeMint,
    };
}

export async function getUserRole(user: PublicKey) {
    const program = getProgram();
    const rolePda = await getGenomePda([ROLE, user.toBuffer()]);
    const userRole = await program.account.roleInfo.fetch(rolePda);
    return userRole.roles;
}

export async function getGenomePda(seeds: Array<Buffer | Uint8Array>): Promise<PublicKey> {
    const programKeypair = await getKeypairFromFile(GENOME_PROGRAM_PATH);
    return PublicKey.findProgramAddressSync(
        [GENOME_ROOT, ...seeds],
        programKeypair.publicKey
    )[0];
}

export function getProgram() {
    return workspace.GenomeSolana as Program<GenomeSolana>;
}

export function getProvider() {
    const provider = AnchorProvider.env();
    setProvider(provider);
    return provider;
}

export function getConstant(name: string): Uint8Array {
    return JSON.parse(
        PROGRAM.idl.constants.find((obj) => obj.name == name)!.value
    );
}

export function parseRole(roleArg: string): Role {
    switch (roleArg.toLowerCase()) {
        case "verifier":
            return { verifier: {} };
        case "operator":
            return { operator: {} };
        case "organizer":
            return { organizer: {} };
        default:
            throw new Error("Invalid role. Use one of these: 'verifier', 'operator', 'organizer'.");
    }
}

export async function buildAndSendTx(
    ixs: TransactionInstruction[],
    signers: Keypair[]
): Promise<string> {
    const connection = PROGRAM.provider.connection;
    const tx = new Transaction().add(...ixs);
    return await sendAndConfirmTransaction(connection, tx, signers);
}

export async function airdropAll(
    pubkeys: Array<PublicKey>,
    sols: number
): Promise<void> {
    await Promise.all(pubkeys.map((pk) => airdrop(pk, sols)));
}

async function airdrop(address: PublicKey, sols: number) {
    const provider = getProvider();
    let txid = await provider.connection.requestAirdrop(
        address,
        sols * LAMPORTS_PER_SOL
    );
    let { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight,
    });
}
