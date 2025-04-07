import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx, getSingleConfig, prettify } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main() {
  const args = process.argv.slice(2);
  const [
    deployerPath,
    adminAddress,
    platformFeeStr,
    minTeamsStr,
    maxTeamsStr,
    falsePrecisionStr,
    maxOrganizerFeeStr,
    consensusRateStr,
    platformWalletAddress,
    nomeMintAddress
  ] = args;

  const deployer = await getKeypairFromFile(deployerPath);
  const admin = new PublicKey(adminAddress);
  const nomeMint = new PublicKey(nomeMintAddress);
  const platformWallet = new PublicKey(platformWalletAddress);

  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);

  const ixBuilder = new IxBuilder();
  const initializeIx = await ixBuilder.initializeSingleIx(
    deployer.publicKey,
    {
      platformFee: new BN(platformFeeStr),
      minTeams: parseInt(minTeamsStr),
      maxTeams: parseInt(maxTeamsStr),
      falsePrecision: parseFloat(falsePrecisionStr),
      consensusRate: parseFloat(consensusRateStr),
      maxOrganizerFee: new BN(maxOrganizerFeeStr),
      admin,
      platformWallet,
      nomeMint,
      verifierAddresses: []
    });

  const txSignature = await buildAndSendTx([initializeIx], [deployer]);
  console.log("Initialize Genome tx:", txSignature);

  const config = await getSingleConfig();
  console.log(`GenomeConfig: ${prettify(config)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
