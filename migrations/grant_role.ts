import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { Transaction } from "@solana/web3.js";
import { IxBuilder } from "../common/ixBuilder";

async function main() {
    const adminKeypairPath = process.argv[2];
    const userAddress = process.argv[3];
    const roleArg = process.argv[4];

    const admin = await getKeypairFromFile(adminKeypairPath);
    const user = new anchor.web3.PublicKey(userAddress);
    let role;
    switch (roleArg.toLowerCase()) {
        case "verifier":
            role = { verifier: {} };
            break;
        case "operator":
            role = { operator: {} };
            break;
        case "organizer":
            role = { organizer: {} };
            break;
        default:
            throw new Error("Invalid role. Use one of these: 'verifier', 'operator', 'organizer'.");
    }

    console.log(`admin: ${admin.publicKey.toBase58()}`);
    console.log(`user: ${user.toBase58()}`);
    console.log(`role: ${JSON.stringify(role)}`);

    const ixBuilder = new IxBuilder();
    const grantRoleIx = await ixBuilder.grantRoleIx(admin.publicKey, user, role);
    const tx = new Transaction().add(grantRoleIx);

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const txSignature = await provider.sendAndConfirm(tx, [admin]);
    console.log("Grant role tx signature:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
