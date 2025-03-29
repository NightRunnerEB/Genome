import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { assert } from "chai";

export function getKeyPairs(): {
  admin: Keypair,
  organizer: Keypair,
  platform: Keypair,
  deployer: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  operator: Keypair,
  nome: Keypair
} {
  const adminSecret = Uint8Array.from(require("../keys/admin.json"));
  const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
  const platformSecret = Uint8Array.from(require("../keys/platform_wallet.json"));
  const deployerSecret = Uint8Array.from(require("../keys/deployer.json"));
  const verifier1Secret = Uint8Array.from(require("../keys/verifier1.json"));
  const verifier2Secret = Uint8Array.from(require("../keys/verifier2.json"));
  const operatorSecret = Uint8Array.from(require("../keys/operator.json"));
  const nomeSecret = Uint8Array.from(require("../keys/nome.json"));

  const admin = Keypair.fromSecretKey(adminSecret);
  const organizer = Keypair.fromSecretKey(organizerSecret);
  const platform = Keypair.fromSecretKey(platformSecret);
  const deployer = Keypair.fromSecretKey(deployerSecret);
  const verifier1 = Keypair.fromSecretKey(verifier1Secret);
  const verifier2 = Keypair.fromSecretKey(verifier2Secret);
  const operator = Keypair.fromSecretKey(operatorSecret);
  const nome = Keypair.fromSecretKey(nomeSecret);

  return {
    admin,
    organizer,
    platform,
    deployer,
    verifier1,
    verifier2,
    operator,
    nome
  };
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
