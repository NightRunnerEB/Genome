import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { assert } from "chai";

import { getProgram } from "../common";

const DEPLOYER_PATH = "./keys/deployer.json";
const ADMIN_PATH = "./keys/admin.json";
const ATTACKER_PATH = "./keys/attacker.json";

export async function getKeypairs(): Promise<{
  deployer: Keypair;
  admin: Keypair;
  attacker: Keypair;
}> {
  const deployer = await getKeypairFromFile(DEPLOYER_PATH);
  const admin = await getKeypairFromFile(ADMIN_PATH);
  const attacker = await getKeypairFromFile(ATTACKER_PATH);

  await Promise.all(
    [admin, deployer, attacker].map(async (keypair) =>
      airdrop(keypair.publicKey, 10)
    )
  );
  return { deployer, admin, attacker };
}

export function checkAnchorError(error: any, errMsg: string) {
  let errorMessage: string;
  if (error instanceof anchor.AnchorError) {
    errorMessage = error.error.errorMessage;
  } else {
    errorMessage = error.message;
  }
  assert.ok(errorMessage.includes(errMsg));
}

async function airdrop(address: PublicKey, amount: number) {
  const connection = getProgram().provider.connection;
  let txid = await connection.requestAirdrop(
    address,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );
  let { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: txid,
    blockhash,
    lastValidBlockHeight,
  });
}
