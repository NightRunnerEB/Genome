import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { GenomeContract } from "../target/types/genome_contract";

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
    const program = getProgram();
    const configPda = getConfigPda();
    const config = await program.account.genomeConfig.fetch(configPda);
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
    const program = getProgram();
    const userRolePda = getUserRolePda(user.toBuffer());
    const userRole = await program.account.roleInfo.fetch(userRolePda);
    return { role: userRole.role };
}

export function getProvider() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    return provider;
}

export async function airdropAll(pubkeys: Array<anchor.web3.PublicKey>, lamports: number): Promise<void> {
    await Promise.all(pubkeys.map((pubkey) => airdrop(pubkey, lamports)));
}

export function getProgram() {
    return anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;
}

function GenomeSeed(): Buffer {
    const genomeProgram = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;
    const genomeRootConstant = genomeProgram.idl.constants.find(
        (c: any) => c.name === "genomeRoot"
    );
    if (!genomeRootConstant) {
        throw new Error("Missing genomeRoot constant in IDL");
    }
    const genomeRootArray = JSON.parse(genomeRootConstant.value);
    return Buffer.from(genomeRootArray);
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

function getConfigPda(): PublicKey {
    const genomeProgram = getProgram();
    const configConstant = genomeProgram.idl.constants.find(
        (c: any) => c.name === "config"
    );
    if (!configConstant) {
        throw new Error("Missing config constant in IDL");
    }
    const configArray = JSON.parse(configConstant.value);
    const configBuffer = Buffer.from(configArray);
    return PublicKey.findProgramAddressSync(
        [GenomeSeed(), configBuffer],
        genomeProgram.programId
    )[0];
}

function getUserRolePda(
    user: any
): PublicKey {
    const genomeProgram = getProgram();
    const roleConstant = genomeProgram.idl.constants.find(
        (c: any) => c.name === "role"
    );
    if (!roleConstant) {
        throw new Error("Missing role constant in IDL");
    }
    const roleArray = JSON.parse(roleConstant.value);
    const roleBuffer = Buffer.from(roleArray);
    const userBuffer = Buffer.from(user);
    return PublicKey.findProgramAddressSync(
        [GenomeSeed(), roleBuffer, userBuffer],
        genomeProgram.programId
    )[0];
}
