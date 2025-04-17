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
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, Account as SplTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getKeypairFromFile } from "@solana-developers/helpers";

const PROGRAM = getProgram();
const GENOME_PROGRAM_PATH = "./keys/genome-program.json";

export const GENOME_OMNI_CONFIG = getConstant("omniConfig");
export const GENOME_SINGLE_CONFIG = getConstant("singleConfig");
export const TEAM = getConstant("team");
export const GENOME_ROOT = getConstant("genomeRoot");
export const TOURNAMENT = getConstant("tournament");
export const ROLE = getConstant("role");
export const TOKEN = getConstant("token");
export const PLATFORM = getConstant("platform");
export const FINISH = getConstant("finish");
export const CONSENSUS = getConstant("consensus");
export const BLOOM = getConstant("bloom");

export type GenomeSingleConfig = IdlTypes<GenomeSolana>['genomeSingleConfig'];
export type TournamentConfig = IdlTypes<GenomeSolana>['tournamentConfig'];
export type Tournament = IdlTypes<GenomeSolana>['tournament'];
export type Team = IdlTypes<GenomeSolana>['team'];
export type TokenInfo = IdlTypes<GenomeSolana>['tokenInfo'];
export type RoleInfo = IdlTypes<GenomeSolana>['roleInfo'];
export type Role = IdlTypes<GenomeSolana>['role'];
export type FinishMetaData = IdlTypes<GenomeSolana>['finishMetaData'];

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

export async function getSingleConfig(): Promise<GenomeSingleConfig> {
    const configPda = await getGenomePda([GENOME_SINGLE_CONFIG]);
    const config = await PROGRAM.account.genomeSingleConfig.fetch(configPda);
    return config
}

export async function getTokenInfo(assetMint: PublicKey): Promise<TokenInfo>  {
    const tokenPda = await getGenomePda([TOKEN, assetMint.toBuffer()]);
    const tokenInfo = await PROGRAM.account.tokenInfo.fetch(tokenPda);
    return tokenInfo;
}

export async function getRoleInfo(user: PublicKey): Promise<RoleInfo>  {
    const program = getProgram();
    const rolePda = await getGenomePda([ROLE, user.toBuffer()]);
    const roleInfo = await program.account.roleInfo.fetch(rolePda);
    return roleInfo;
}

export async function getTournament(id: number): Promise<Tournament> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(id, 0);
    const tournamentPda = await getGenomePda([TOURNAMENT, idBuffer]);
    const tournament = await PROGRAM.account.tournament.fetch(tournamentPda);
    return tournament;
}

export async function getTeam(tournamentId: number, captain: PublicKey): Promise<Team> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const teamPda = await getGenomePda([TEAM, idBuffer, captain.toBuffer()]);
    const team = await PROGRAM.account.team.fetch(teamPda);
    return team;
}

export async function getFinishInfo(tournamentId: number): Promise<FinishMetaData> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const finishPda = await getGenomePda([FINISH, idBuffer]);
    const finishMetaData = await PROGRAM.account.finishMetaData.fetch(finishPda);
    return finishMetaData;
}

export async function getAtaInfo(
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

    return getAccount(
        getProvider().connection,
        prizePoolAta,
        undefined,
        TOKEN_PROGRAM_ID
    );
}

export async function getGenomePda(seeds: Array<Buffer | Uint8Array>): Promise<PublicKey> {
    const programKeypair = await getKeypairFromFile(GENOME_PROGRAM_PATH);
    return PublicKey.findProgramAddressSync(
        [GENOME_ROOT, ...seeds],
        programKeypair.publicKey
    )[0];
}

export async function airdropAll(
    pubkeys: Array<PublicKey>,
    sols: number
): Promise<void> {
    await Promise.all(pubkeys.map((pk) => airdrop(pk, sols)));
}

export function getProgram() {
    return workspace.GenomeSolana as Program<GenomeSolana>;
}

export function getProvider() {
    const provider = AnchorProvider.env();
    setProvider(provider);
    return provider;
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

function getConstant(name: string): Uint8Array {
    return JSON.parse(
        PROGRAM.idl.constants.find((obj) => obj.name == name)!.value
    );
}
