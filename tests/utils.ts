import * as anchor from "@coral-xyz/anchor";

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

    return { admin };
}
