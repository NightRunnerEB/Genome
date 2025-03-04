import * as anchor from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const GENOME_ROOT = utf8.encode("genome-0");

export function getProvider() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    return provider;
}

export function getAdminKeyPairs(): {
    admin: anchor.web3.Keypair;
} {
    const adminSecret = Uint8Array.from(require("/Users/evgeniybukharev/.config/solana/id.json"));
    const admin = anchor.web3.Keypair.fromSecretKey(adminSecret);

    return {
        admin,
    };
}

export function getKeyPairs(): {
    admin: anchor.web3.Keypair;
    attacker: anchor.web3.Keypair;
    genomeToken: anchor.web3.Keypair;
    someToken: anchor.web3.Keypair;
    platformWallet: anchor.web3.Keypair;
} {
    const adminSecret = Uint8Array.from(require("../keys/admin.json"));
    const attackerSecret = Uint8Array.from(require("../keys/attacker.json"));
    const genomeTokenSecret = Uint8Array.from(
        require("../keys/genome-token.json")
    );
    const someTokenSecret = Uint8Array.from(require("../keys/some-token.json"));
    const platformWalletSecret = Uint8Array.from(
        require("../keys/platform-wallet.json")
    );

    const admin = anchor.web3.Keypair.fromSecretKey(adminSecret);
    const attacker = anchor.web3.Keypair.fromSecretKey(attackerSecret);
    const genomeToken = anchor.web3.Keypair.fromSecretKey(genomeTokenSecret);
    const someToken = anchor.web3.Keypair.fromSecretKey(someTokenSecret);
    const platformWallet =
        anchor.web3.Keypair.fromSecretKey(platformWalletSecret);

    return {
        admin,
        attacker,
        genomeToken,
        someToken,
        platformWallet,
    };
}

export function getGenomePda(
    seeds: Uint8Array<ArrayBufferLike>[]
): [anchor.web3.PublicKey, number] {
    const genomeProgram = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;
    return anchor.web3.PublicKey.findProgramAddressSync(
        [GENOME_ROOT].concat(seeds),
        genomeProgram.programId
    );
}

export async function airdrop(address: anchor.web3.PublicKey, amount: number) {
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

export const hexToBytes = (hex: string) =>
    Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
