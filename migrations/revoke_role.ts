import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { getProgram } from "./utils";

async function main() {
    const adminKeypairPath = process.argv[2];
    const userAddress = process.argv[3];

    const admin = await getKeypairFromFile(adminKeypairPath);
    const user = new anchor.web3.PublicKey(userAddress);

    console.log(`admin: ${admin.publicKey.toBase58()}`);
    console.log(`user: ${user.toBase58()}`);

    const program = getProgram();

    const tx = await program.methods
        .revokeRole()
        .accounts({
            admin: admin.publicKey,
            user: user,
        })
        .signers([admin])
        .rpc();

    console.log("Revoke role tx signature:", tx);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
