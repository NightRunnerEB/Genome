import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
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

    const mint = await splToken.createMint(
        getProvider().connection,
        admin,
        admin.publicKey,
        null,
        6,
        token,
        null,
        splToken.TOKEN_2022_PROGRAM_ID
    );
    console.log("Genome mint:", mint.toBase58());
    console.log("Genome token:", token.publicKey.toBase58());

    const sponsorAta = await splToken.createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        sponsor.publicKey,
        null,
        splToken.TOKEN_2022_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Sponsor genome ata:", sponsorAta.toBase58());

    const reward_pool_ata = await splToken.createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        organizer.publicKey,
        null,
        splToken.TOKEN_2022_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Tournament pool ata:", reward_pool_ata.toBase58());

    let tx = await splToken.mintTo(
        getProvider().connection,
        admin,
        token.publicKey,
        sponsorAta,
        admin,
        1000000000000000,
        [],
        {},
        splToken.TOKEN_2022_PROGRAM_ID
    );
    console.log("Mint to sponsor tx:", tx);

    return { mint, sponsorAta };
}

export async function delegateAccount(
    sponsorAta: PublicKey
): Promise<String> {
    let provider = getProvider();
    let { admin, sponsor, organizer, token } = getKeyPairs();
    return splToken.approveChecked(
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
        splToken.TOKEN_2022_PROGRAM_ID
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
