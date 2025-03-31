import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { GenomeContract } from "../target/types/genome_contract";
import { get } from "http";

const PROGRAM = getProgram();

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
            if (obj[key] instanceof anchor.BN) {
                prettyObj[key] = obj[key].toNumber();
            } else {
                prettyObj[key] = obj[key];
            }
        }
    }

    return JSON.stringify(prettyObj, null, 2);
}

export async function getConfig() {
    const configPda = getPda([getConstant("config")]);
    const config = await PROGRAM.account.genomeConfig.fetch(configPda);
    return {
        admin: config.admin,
        verifierAddresses: config.verifierAddresses,
        consensusRate: config.consensusRate,
        tournamentNonce: config.tournamentNonce,
        platformFee: config.platformFee,
        platformWallet: config.platformWallet,
        falsePrecision: config.falsePrecision,
        minTeams: config.minTeams,
        maxTeams: config.maxTeams,
        maxOrganizerFee: config.maxOrganizerFee,
        nomeMint: config.nomeMint,
    };
}

export async function getUserRole(user: PublicKey) {
    const rolePda = getPda([getConstant("role"), user.toBuffer()]);
    const userRole = await PROGRAM.account.roleInfo.fetch(rolePda);
    return { role: userRole.role };
}

export async function airdropAll(pubkeys: Array<anchor.web3.PublicKey>, lamports: number): Promise<void> {
    await Promise.all(pubkeys.map((pubkey) => airdrop(pubkey, lamports)));
}

export function getProgram() {
    return anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;
}

export function getProvider() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    return provider;
}

function getConstant(name: string): Uint8Array {
    return JSON.parse(
        PROGRAM.idl.constants.find((obj) => obj.name == name)!.value
    );
}

async function airdrop(address: PublicKey, amount: number) {
    const provider = getProvider();
    let txid = await provider.connection.requestAirdrop(
        address,
        amount * anchor.web3.LAMPORTS_PER_SOL
    );
    let { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight,
    });
}

function getPda(seeds: Array<Buffer | Uint8Array>): PublicKey {
    return PublicKey.findProgramAddressSync([getConstant("genomeRoot"), ...seeds], PROGRAM.programId)[0];
}
