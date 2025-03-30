import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/node-helpers";

import { getConfig, getProvider, prettify } from "../common/utils";
import { IxBuilder } from "../common/ixBuilder";

async function main() {
  const args = process.argv.slice(2);
  const [
    deployerPath,
    adminAddress,
    platformWalletStr,
    tournamentNonceStr,
    platformFeeStr,
    minTeamsStr,
    maxTeamsStr,
    falsePrecisionStr,
    maxOrganizerFeeStr,
    consensusRateStr,
    ...verifiersAddresses
  ] = args;

  const deployer = await getKeypairFromFile(deployerPath);
  const admin = new anchor.web3.PublicKey(adminAddress);
  const platformWallet = new anchor.web3.PublicKey(platformWalletStr);
  const verifiers = verifiersAddresses.map(v => new anchor.web3.PublicKey(v));

  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  const provider = getProvider();
  const ixBuilder = new IxBuilder();
  const initializeIx = await ixBuilder.initializeIx(
    deployer.publicKey,
    {
      tournamentNonce: parseInt(tournamentNonceStr),
      platformFee: new anchor.BN(platformFeeStr),
      minTeams: parseInt(minTeamsStr),
      maxTeams: parseInt(maxTeamsStr),
      falsePrecision: parseFloat(falsePrecisionStr),
      consensusRate: parseFloat(consensusRateStr),
      maxOrganizerFee: new anchor.BN(maxOrganizerFeeStr),
      admin: admin,
      platformWallet,
      verifierAddresses: verifiers
    }
  );
  const tx = new Transaction().add(initializeIx);

  const txSignature = await provider.sendAndConfirm(tx, [deployer]);
  console.log("Initialize Genome tx:", txSignature);
  const config = await getConfig();
  console.log(`GenomeConfig: ${prettify(config)}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
