import { BN } from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [claimerKeypairPath, amountStr] = args;
  const claimer = await getKeypairFromFile(claimerKeypairPath);
  const amount = new BN(amountStr);

  const ixBuilder = new IxBuilder();
  const claimRoleFundIx = await ixBuilder.claimRoleFundIx(
    claimer.publicKey,
    amount
  );
  const txSignature = await buildAndSendTx([claimRoleFundIx], [claimer]);
  console.log("Claim role fund tx signature:", txSignature);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
