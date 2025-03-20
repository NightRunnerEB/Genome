import { web3 } from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";
import config from "./config";
import { prettify } from "./utils";

async function main() {
  const deployerPath = process.argv[2];
  const adminPath = process.argv[3];
  const platformWallet = process.argv[4];

  const deployer = await getKeypairFromFile(deployerPath);
  const admin = await getKeypairFromFile(adminPath);

  console.log(`deployer = ${deployer.publicKey.toBase58()}`);
  console.log(`admin = ${admin.publicKey.toBase58()}`);
  console.log(`platformWallet = ${platformWallet}`);
  console.log(`genomeConfig = ${prettify(config.genomeConfig)}`);

  await initialize(deployer, admin, platformWallet);
}

async function initialize(
  deployer: web3.Keypair,
  admin: web3.Keypair,
  platformAddress: string
) {
  const program = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;

  const platformWallet = new web3.PublicKey(platformAddress);
  const genomeConfig: any = {
    ...config.genomeConfig,
    admin: admin.publicKey,
    platformWallet,
  };

  const tx = await program.methods
    .initialize(genomeConfig)
    .accounts({ admin: deployer.publicKey })
    .signers([deployer])
    .transaction();

  let provider = anchor.AnchorProvider.env();
  let txSignature = await provider.sendAndConfirm(tx, [deployer]);
  console.log(`Initialize tx: ${txSignature}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
