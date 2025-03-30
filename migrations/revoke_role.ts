import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/node-helpers";

import { IxBuilder } from "../common/ixBuilder";

async function main() {
    const adminKeypairPath = process.argv[2];
    const userAddress = process.argv[3];
    const admin = await getKeypairFromFile(adminKeypairPath);
    const user = new anchor.web3.PublicKey(userAddress);

    console.log(`admin: ${admin.publicKey.toBase58()}`);
    console.log(`user: ${user.toBase58()}`);

    const ixBuilder = new IxBuilder();
    const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, user);
    const tx = new Transaction().add(revokeIx);

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const txSignature = await provider.sendAndConfirm(tx, [admin]);
    console.log("Revoke role tx:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
