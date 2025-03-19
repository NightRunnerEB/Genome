import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    getAccount,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    Account as SplTokenAccount,
    createAssociatedTokenAccount,
    approveChecked,
    mintTo,
    createMint
} from "@solana/spl-token";
import { GenomeContract } from "../target/types/genome_contract";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { assert } from "chai";

export const GENOME_ROOT = utf8.encode("genome");
export const CONFIG = utf8.encode("config");
export const TOURNAMENT = utf8.encode("tournament");

export function getProvider() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    return provider;
}

export function getKeyPairs(): {
    admin: Keypair,
    organizer: Keypair,
    sponsor: Keypair,
    token: Keypair,
} {
    const adminSecret = Uint8Array.from(require("../keys/admin.json"));
    const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
    const sponsorSecret = Uint8Array.from(require("../keys/sponsor.json"));
    const tokenSecret = Uint8Array.from(
        require("../keys/token.json")
    );

    const admin = Keypair.fromSecretKey(adminSecret);
    const organizer = Keypair.fromSecretKey(organizerSecret);
    const sponsor = Keypair.fromSecretKey(sponsorSecret);
    const token = Keypair.fromSecretKey(tokenSecret);

    return {
        admin,
        organizer,
        sponsor,
        token,
    };
}

export function getGenomePda(): PublicKey {
    const genomeProgram = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;
    return PublicKey.findProgramAddressSync(
        [GENOME_ROOT, CONFIG],
        genomeProgram.programId
    )[0];
}

export function getTournamentPda(
    seeds: Uint8Array<ArrayBufferLike>
): PublicKey {
    const genomeProgram = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;
    return PublicKey.findProgramAddressSync(
        [GENOME_ROOT, TOURNAMENT].concat(seeds),
        genomeProgram.programId
    )[0];
}

export async function getPrizePoolAta(
    mint: PublicKey,
    authority: PublicKey
): Promise<SplTokenAccount> {
    const prizePoolAta = await getAssociatedTokenAddress(
        mint,
        authority,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const provider = getProvider();
    return getAccount(
        provider.connection,
        prizePoolAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );
}

export async function getSponsorAta(
    sponsorPoolAta: PublicKey
): Promise<SplTokenAccount> {
    const provider = getProvider();
    return getAccount(
        provider.connection,
        sponsorPoolAta,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );
}

export async function airdrop(address: PublicKey, amount: number) {
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

export async function createGenomeMint(): Promise<{ mint: PublicKey; sponsorAta: PublicKey }> {
    let { admin, sponsor, organizer, token } = getKeyPairs();

    const mint = await createMint(
        getProvider().connection,
        admin,
        admin.publicKey,
        null,
        6,
        token,
        null,
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Genome mint:", mint.toBase58());

    const sponsorAta = await createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        sponsor.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Sponsor genome ata:", sponsorAta.toBase58());

    const reward_pool_ata = await createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        organizer.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Tournament pool ata:", reward_pool_ata.toBase58());

    let tx = await mintTo(
        getProvider().connection,
        admin,
        token.publicKey,
        sponsorAta,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Mint to sponsor tx:", tx);

    return { mint, sponsorAta };
}

export async function delegateAccount(
    sponsorAta: PublicKey
): Promise<String> {
    let provider = getProvider();
    let { admin, sponsor, organizer, token } = getKeyPairs();
    return approveChecked(
        provider.connection,
        admin,
        token.publicKey,
        sponsorAta,
        organizer.publicKey,
        sponsor,
        1e8,
        6,
        [],
        {},
        TOKEN_2022_PROGRAM_ID
    );
}

export async function createInvalidTournament(
    txBuilder: any,
    tournamentData: any,
    expectedRegex: RegExp
): Promise<void> {
    let { sponsor, organizer, token } = getKeyPairs();
    try {
        await txBuilder.createTournamentSinglechain(organizer, sponsor, token.publicKey, tournamentData)
        assert.fail("An error was expected, but the transaction was successful");
    } catch (err: any) {
        assert.match(err.toString(), expectedRegex);
    }
}
