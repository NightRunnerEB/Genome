import { web3 } from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";
import { prettify } from "./utils";
import { getGenomePda } from "../tests/utils";
import { BN } from "@coral-xyz/anchor";

async function main() {
  const args = process.argv.slice(2);
  const [
    deployerPath,
    adminAddress,
    platformWalletStr,
    tournamentNonceStr,
    platformFeeStr,
    minEntryFeeStr,
    minSponsorPoolStr,
    minTeamsStr,
    maxTeamsStr,
    falsePrecisionStr,
    maxOrganizerFeeStr,
    ...verifiersAddresses
  ] = args;

  const deployer = await getKeypairFromFile(deployerPath);
  const admin = new web3.PublicKey(adminAddress);
  const platformWallet = new web3.PublicKey(platformWalletStr);
  const verifiers = verifiersAddresses.map(v => new anchor.web3.PublicKey(v));

  const genomeConfig: any = {
    tournamentNonce: parseInt(tournamentNonceStr),
    platformFee: new BN(platformFeeStr),
    minEntryFee: new BN(minEntryFeeStr),
    minSponsorPool: new BN(minSponsorPoolStr),
    minTeams: parseInt(minTeamsStr),
    maxTeams: parseInt(maxTeamsStr),
    falsePrecision: parseFloat(falsePrecisionStr),
    maxOrganizerFee: new BN(maxOrganizerFeeStr),
    admin: admin,
    platformWallet,
    verifierAddresses: verifiers
  };

  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  await initialize(
    deployer,
    genomeConfig
  );
}

async function initialize(
  deployer: web3.Keypair,
  genomeConfig: any
) {
  const program = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;

  const tx = await program.methods
    .initialize(genomeConfig)
    .accounts({ admin: deployer.publicKey })
    .signers([deployer])
    .transaction();

  const provider = anchor.AnchorProvider.env();
  const txSignature = await provider.sendAndConfirm(tx, [deployer]);
  console.log(`Initialize tx: ${txSignature}`);

  const configPda = getGenomePda();
  const configData = await program.account.genomeConfig.fetch(configPda);
  console.log(`GenomeConfig: ${prettify(configData)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
