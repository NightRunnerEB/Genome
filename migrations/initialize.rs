import * as fs from "fs";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { GenomeContract } from "../target/types/genome_contract";

const GENOME_ROOT = utf8.encode("genome");
const CONFIG = utf8.encode("config");

async function main() {
  const deployerPath = process.argv[2];
  const keysPath = process.argv[3];

  const deployer = await getKeypairFromFile(deployerPath);
  const admin = await getKeypairFromFile(keysPath + "/admin.json");

  console.log("deployer: ", deployer.publicKey.toBase58());
  console.log("admin: ", admin.publicKey.toBase58());

  if (!fs.existsSync(keysPath)) {
    fs.mkdirSync(keysPath);
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;

  const [configPda, configBump] = PublicKey.findProgramAddressSync(
    [GENOME_ROOT, CONFIG],
    program.programId
  );
  console.log("Config PDA:", configPda.toBase58());

  const configData = {
    admin: admin.publicKey,
    tournamentNonce: 0,
    platformFee: new anchor.BN(10),
    platformWallet: admin.publicKey,
    minEntryFee: new anchor.BN(10),
    minSponsorPool: new anchor.BN(500),
    minTeams: 2,
    maxTeams: 20,
    maxOrganizerRoyalty: new anchor.BN(5000),
    assetMint: admin.publicKey,
    trustedAgents: [admin.publicKey],
    consensusThreshold: 1,
  };

  const tx: string = await program.methods
    .initialize(configData)
    .accounts({
      admin: deployer.publicKey,
      config: configPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([deployer])
    .rpc();

  console.log("Initialize tx:", tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
