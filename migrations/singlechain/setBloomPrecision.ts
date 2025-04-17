import { BN } from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { buildAndSendTx } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [adminKeypairPath, newPrecisionStr] = args;
  const admin = await getKeypairFromFile(adminKeypairPath);
  const newPrecision = new BN(newPrecisionStr);

  const ixBuilder = new IxBuilder();
  const setBloomPrecisionIx = await ixBuilder.setBloomPrecisionIx(
    admin.publicKey,
    newPrecision
  );
  const txSignature = await buildAndSendTx([setBloomPrecisionIx], [admin]);
  console.log("Set bloom precision tx signature:", txSignature);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
