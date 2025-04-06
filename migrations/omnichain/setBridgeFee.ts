import { BN } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { IxBuilder } from "../../common/ixBuilder";
import { buildAndSendTx } from "../../common/utils";

async function main() {
  const adminPath = process.argv[2];
  const rawBridgeFee = process.argv[3];

  const admin = await getKeypairFromFile(adminPath);
  const bridgeFee = parseInt(rawBridgeFee);

  console.log("admin: ", admin.publicKey.toBase58());
  console.log("bridgeFee: ", bridgeFee);

  await setBridgeFee(admin, bridgeFee);
}

async function setBridgeFee(admin: Keypair, bridgeFee: number) {
  const ixBuilder = new IxBuilder();
  const ix = await ixBuilder.setBridgeFeeIx(admin.publicKey, new BN(bridgeFee));
  const txSignature = await buildAndSendTx([ix], [admin]);
  console.log("Set bridge fee tx: ", txSignature);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
