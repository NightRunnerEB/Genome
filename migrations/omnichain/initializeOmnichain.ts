import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { IxBuilder } from "../../common/ixBuilder";
import { buildAndSendTx } from "../../common/utils";

async function main() {
  const deployerPath = process.argv[2];
  const utsProgramPubkey = process.argv[3];
  const rawBridgeFee = process.argv[4];
  const rawGenomeChainId = process.argv[5];
  const adminPubkey = process.argv[6];

  const deployer = await getKeypairFromFile(deployerPath);
  const utsProgram = new PublicKey(utsProgramPubkey);
  const bridgeFee = parseInt(rawBridgeFee);
  const genomeChainId = parseInt(rawGenomeChainId);
  const admin = new PublicKey(adminPubkey);

  console.log("deployer: ", deployer.publicKey.toBase58());
  console.log("admin: ", admin.toBase58());
  console.log("utsProgram: ", utsProgram.toBase58());
  console.log("bridgeFee: ", bridgeFee);
  console.log("genomeChainId: ", genomeChainId);

  await initializeOmnichain(
    deployer,
    admin,
    utsProgram,
    bridgeFee,
    genomeChainId
  );
}

async function initializeOmnichain(
  deployer: Keypair,
  admin: PublicKey,
  utsProgram: PublicKey,
  bridgeFee: number,
  genomeChainId: number
) {
  const ixBuilder = new IxBuilder();
  const initializeOmniIx = await ixBuilder.initializeOmnichainIx(deployer.publicKey, {
    admin,
    utsProgram,
    bridgeFee: new BN(bridgeFee),
    genomeChainId: new BN(genomeChainId),
  });
  const tx = await buildAndSendTx([initializeOmniIx], [deployer]);
  console.log("Initialize omni tx: ", tx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
