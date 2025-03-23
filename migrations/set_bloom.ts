import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";

async function main() {
  const adminPath = process.argv[2];
  const precisionArg = process.argv[3];

  const admin = await getKeypairFromFile(adminPath);
  const precision = parseFloat(precisionArg);

  console.log(`admin = ${admin.publicKey.toBase58()}`);
  console.log(`precision = ${precision}`);

  await setBloomPrecision(admin, precision);
}

async function setBloomPrecision(
  admin: anchor.web3.Keypair,
  precision: number,
) {
  const program = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;

  const tx = await program.methods
    .setBloomPrecision(precision)
    .accounts({
      admin: admin.publicKey,
    })
    .signers([admin])
    .transaction();

  let provider = anchor.AnchorProvider.env();
  let txSignature = await provider.sendAndConfirm(tx, [admin]);
  console.log(`Set bloom precision tx: ${txSignature}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
