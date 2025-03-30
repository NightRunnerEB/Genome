import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { GenomeContract } from "../target/types/genome_contract";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, Account as SplTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
    const configPda = getConfigPda();
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

export async function getUserRole(user: any) {
    const userRolePda = getUserRolePda(user);
    const userRole = await PROGRAM.account.roleInfo.fetch(userRolePda);
    return { role: userRole.role };
}

export async function getTokenInfo(token: any) {
    const tokenPda = getTokenPda(token);
    const tokenInfo = await PROGRAM.account.tokenInfo.fetch(tokenPda);
    return {
        assetMint: tokenInfo.assetMint,
        minSponsorPool: tokenInfo.minSponsorPool,
        minEntryPool: tokenInfo.minEntryFee,
    }

}

export async function getTournament(id: any) {
    const tournamentPda = getTournamentPda(id);
    const tournament = await PROGRAM.account.tournament.fetch(tournamentPda);
    return {
        id: tournament.id,
        teamCount: tournament.teamCount,
        tournamentData: tournament.tournamentData,
        status: tournament.status,
        tournamentPda: tournamentPda,
    };
}

function getConfigPda(): PublicKey {
    const genomeSeed = getConstant("genomeRoot");
    const configArray = getConstant("config");
    return PublicKey.findProgramAddressSync(
        [genomeSeed, configArray],
        PROGRAM.programId
    )[0];
}

function getTournamentPda(id: any): PublicKey {
    const genomeSeed = getConstant("genomeRoot");
    const tournamentArray = getConstant("tournament");
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(id, 0);
    return PublicKey.findProgramAddressSync(
        [genomeSeed, tournamentArray, idBuffer],
        PROGRAM.programId
    )[0];
}

function getUserRolePda(
    user: any
): PublicKey {
    const genomeSeed = getConstant("genomeRoot");
    const roleArray = getConstant("role");
    return PublicKey.findProgramAddressSync(
        [genomeSeed, roleArray, user.toBuffer()],
        PROGRAM.programId
    )[0];
}

function getTokenPda(
    token: any
): PublicKey {
    const genomeSeed = getConstant("genomeRoot");
    const tokenArray = getConstant("token");
    return PublicKey.findProgramAddressSync(
        [genomeSeed, tokenArray, token.toBuffer()],
        PROGRAM.programId
    )[0];
}

function getConstant(name: string): Uint8Array {
    return JSON.parse(
        PROGRAM.idl.constants.find((obj) => obj.name == name)!.value
    );
}