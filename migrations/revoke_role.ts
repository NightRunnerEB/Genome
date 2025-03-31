import { getKeypairFromFile } from "@solana-developers/helpers";
import { PublicKey } from "@solana/web3.js";

import { IxBuilder } from "../common/ixBuilder";
import { buildAndSendTx } from "../common/utils";

async function main() {
    const adminKeypairPath = process.argv[2];
    const userAddress = process.argv[3];
    const admin = await getKeypairFromFile(adminKeypairPath);
    const user = new PublicKey(userAddress);

    console.log(`admin: ${admin.publicKey.toBase58()}`);
    console.log(`user: ${user.toBase58()}`);

    const ixBuilder = new IxBuilder();
    const revokeRoleIx = await ixBuilder.revokeRoleIx(admin.publicKey, user);

    const txSignature = await buildAndSendTx([revokeRoleIx], [admin]);
    console.log("Revoke role tx:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
