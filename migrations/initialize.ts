import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { getProgram, prettify } from "./utils";
import { getConfigPda } from "../tests/utils";

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
  const admin = new anchor.web3.PublicKey(adminAddress);
  const platformWallet = new anchor.web3.PublicKey(platformWalletStr);
  const verifiers = verifiersAddresses.map(v => new anchor.web3.PublicKey(v));

  const genomeConfig: any = {
    tournamentNonce: parseInt(tournamentNonceStr),
    platformFee: new anchor.BN(platformFeeStr),
    minEntryFee: new anchor.BN(minEntryFeeStr),
    minSponsorPool: new anchor.BN(minSponsorPoolStr),
    minTeams: parseInt(minTeamsStr),
    maxTeams: parseInt(maxTeamsStr),
    falsePrecision: parseFloat(falsePrecisionStr),
    maxOrganizerFee: new anchor.BN(maxOrganizerFeeStr),
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
  deployer: anchor.web3.Keypair,
  genomeConfig: any
) {
  const program = getProgram();

  const tx = await program.methods
    .initialize(genomeConfig)
    .accounts({ admin: deployer.publicKey })
    .signers([deployer])
    .transaction();

  const provider = anchor.AnchorProvider.env();
  const txSignature = await provider.sendAndConfirm(tx, [deployer]);
  console.log(`Initialize tx: ${txSignature}`);

  const configPda = getConfigPda();
  const configData = await program.account.genomeConfig.fetch(configPda);
  console.log(`GenomeConfig: ${prettify(configData)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
