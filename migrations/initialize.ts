import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx, getConfig, prettify } from "../common/utils";
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
  const admin = new PublicKey(adminAddress);
  const platformWallet = new PublicKey(platformWalletStr);
  const verifiers = verifiersAddresses.map(v => new PublicKey(v));

  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  const ixBuilder = new IxBuilder();
  const initializeIx = await ixBuilder.initializeIx(
    deployer.publicKey,
    {
      tournamentNonce: parseInt(tournamentNonceStr),
      platformFee: new BN(platformFeeStr),
      minTeams: parseInt(minTeamsStr),
      maxTeams: parseInt(maxTeamsStr),
      falsePrecision: parseFloat(falsePrecisionStr),
      consensusRate: parseFloat(consensusRateStr),
      maxOrganizerFee: new BN(maxOrganizerFeeStr),
      admin: admin,
      platformWallet,
      verifierAddresses: verifiers
    }
  );

  const txSignature = await buildAndSendTx([initializeIx], [deployer]);
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
