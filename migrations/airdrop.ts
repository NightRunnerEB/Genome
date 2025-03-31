import * as fs from "fs";
import * as path from "path";
import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { airdropAll } from "../common/utils";

async function main(): Promise<void> {
  const keysFolder = process.argv[2];
  if (!keysFolder) {
    throw new Error("Please provide the path to the keys folder as the first argument.");
  }

  const files = fs.readdirSync(keysFolder);
  const keyFiles = files.filter((f) => f.endsWith(".json"));

  const keypairs = await Promise.all(
    keyFiles.map((file) => getKeypairFromFile(path.join(keysFolder, file)))
  );
  const recipients = keypairs.map((kp) => kp.publicKey);

  console.log("Recipients:", recipients.map((pk) => pk.toBase58()));
  await airdropAll(recipients, 10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
