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

import { GenomeContract } from "../target/types/genome_contract";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, Account as SplTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const PROGRAM = getProgram();

export type Role = IdlTypes<GenomeContract>["role"];

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

export async function getConfig() {
    const configPda = getGenomePda([getConstant("config")]);
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

export async function getTokenInfo(assetMint: PublicKey) {
    const tokenPda = getGenomePda([getConstant("token"), assetMint.toBuffer()]);
    const tokenInfo = await PROGRAM.account.tokenInfo.fetch(tokenPda);
    return {
        assetMint: tokenInfo.assetMint,
        minSponsorPool: tokenInfo.minSponsorPool,
        minEntryFee: tokenInfo.minEntryFee,
    };
}

export async function getTournament(id: any) {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(id, 0);
    const tournamentPda = getGenomePda([getConstant("tournament"), idBuffer]);
    const tournament = await PROGRAM.account.tournament.fetch(tournamentPda);
    return {
        id: tournament.id,
        tournamentData: tournament.tournamentData,
        status: tournament.status,
        teamCount: tournament.teamCount,
        tournamentPda: tournamentPda
    };

}

export async function getSponsorAta(
    sponsorPoolAta: PublicKey
): Promise<SplTokenAccount> {
    const provider = getProvider();
    return getAccount(
        provider.connection,
        sponsorPoolAta,
        undefined,
        TOKEN_PROGRAM_ID
    );
}

export async function getPrizePoolAta(
    mint: PublicKey,
    authority: PublicKey
): Promise<SplTokenAccount> {
    const prizePoolAta = await getAssociatedTokenAddress(
        mint,
        authority,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const provider = getProvider();
    return getAccount(
        provider.connection,
        prizePoolAta,
        undefined,
        TOKEN_PROGRAM_ID
    );
}

export function getGenomePda(seeds: Array<Buffer | Uint8Array>): PublicKey {
    return PublicKey.findProgramAddressSync(
        [getConstant("genomeRoot"), ...seeds],
        PROGRAM.programId
    )[0];
}

export async function airdropAll(
    pubkeys: Array<PublicKey>,
    sols: number
): Promise<void> {
    await Promise.all(pubkeys.map((pk) => airdrop(pk, sols)));
}

export function getProgram() {
    return workspace.GenomeContract as Program<GenomeContract>;
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
    const connection = getProgram().provider.connection;
    const tx = new Transaction().add(...ixs);
    return await sendAndConfirmTransaction(connection, tx, signers);
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
