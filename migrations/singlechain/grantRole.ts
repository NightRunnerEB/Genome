import { getKeypairFromFile } from "@solana-developers/helpers";
import { TransactionInstruction, PublicKey } from "@solana/web3.js";

import { IxBuilder } from "../../common/ixBuilder";
import { buildAndSendTx, parseRole } from "../../common/utils";

async function main(): Promise<void> {
  const adminKeypairPath = process.argv[2];
  const userAddress = process.argv[3];
  const roleArg = process.argv[4];

  const admin = await getKeypairFromFile(adminKeypairPath);
  const user = new PublicKey(userAddress);
  const role = parseRole(roleArg);

    console.log(`admin: ${admin.publicKey.toBase58()}`);
    console.log(`user: ${user.toBase58()}`);
    console.log(`role: ${JSON.stringify(role)}`);

  const ixBuilder = new IxBuilder();
  const grantRoleIx: TransactionInstruction = await ixBuilder.grantRoleIx(
    admin.publicKey,
    user,
    role
  );

  const txSignature = await buildAndSendTx([grantRoleIx], [admin]);
  console.log("Grant role tx signature:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
