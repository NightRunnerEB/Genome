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
export const TEAM = utf8.encode("team");

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
    captain: Keypair,
    participant1: Keypair,
    participant2: Keypair,
    participant3: Keypair,
} {
    const adminSecret = Uint8Array.from(require("../keys/admin.json"));
    const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
    const sponsorSecret = Uint8Array.from(require("../keys/sponsor.json"));
    const captainSecret = Uint8Array.from(require("../keys/captain.json"));
    const participant1Secret = Uint8Array.from(require("../keys/participant_1.json"));
    const participant2Secret =Uint8Array.from(require("../keys/participant_2.json"));
    const participant3Secret =Uint8Array.from(require("../keys/participant_3.json"));
    const tokenSecret = Uint8Array.from(
        require("../keys/token.json")
    );
    const admin = Keypair.fromSecretKey(adminSecret);
    const organizer = Keypair.fromSecretKey(organizerSecret);
    const sponsor = Keypair.fromSecretKey(sponsorSecret);
    const token = Keypair.fromSecretKey(tokenSecret);
    const captain = Keypair.fromSecretKey(captainSecret);
    const participant1 = Keypair.fromSecretKey(participant1Secret);
    const participant2 = Keypair.fromSecretKey(participant2Secret);
    const participant3 = Keypair.fromSecretKey(participant3Secret);

    return {
        admin,
        organizer,
        sponsor,
        token,
        captain,
        participant1,
        participant2,
        participant3
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

export function getTeamPda(
    seeds: Uint8Array<ArrayBufferLike>[]
): PublicKey {
    const genomeProgram = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;
    return PublicKey.findProgramAddressSync(
        [GENOME_ROOT, TEAM].concat(seeds),
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
    let { admin, sponsor, organizer, token, captain, participant1, participant3 } = getKeyPairs();

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
    console.log("Genome token:", token.publicKey.toBase58());

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

    const captain_ata = await createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        captain.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Captain ata:", captain_ata.toBase58());

    const participant1_ata = await createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        participant1.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Participant1 ata:", participant1_ata.toBase58());

    const participant3_ata = await  createAssociatedTokenAccount(
        getProvider().connection,
        admin,
        token.publicKey,
        participant3.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Participant3 ata:", participant3_ata.toBase58());

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

    tx = await mintTo(
        getProvider().connection,
        admin,
        token.publicKey,
        captain_ata,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Mint to captain tx:", tx);

    tx = await mintTo(
        getProvider().connection,
        admin,
        token.publicKey,
        participant3_ata,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Mint to participant3 tx:", tx);

    tx = await mintTo(
        getProvider().connection,
        admin,
        token.publicKey,
        participant1_ata,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Mint to participant1 tx:", tx);

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
