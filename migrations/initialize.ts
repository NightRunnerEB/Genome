import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";

import { prettify } from "./utils";
import { TxBuilder } from "../tests/txBuilder";

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

  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  const txBuilder = new TxBuilder();
  const tx = txBuilder.initialize(
    deployer,
    {
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
    }
  );
  console.log(`Initialize tx: ${tx}`);

  const config = txBuilder.getConfig();
  console.log(`GenomeConfig: ${prettify(config)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
