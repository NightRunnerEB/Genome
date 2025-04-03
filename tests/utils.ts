import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { getConstant, getGenomePda, getProgram, getProvider } from "../common/utils";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export function getKeyPairs(): {
  admin: Keypair,
  organizer: Keypair,
  platform: Keypair,
  deployer: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  operator: Keypair,
  nome: Keypair,
  token: Keypair
} {
  const adminSecret = Uint8Array.from(require("../keys/admin.json"));
  const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
  const platformSecret = Uint8Array.from(
    require("../keys/platform_wallet.json")
  );
  const deployerSecret = Uint8Array.from(require("../keys/deployer.json"));
  const verifier1Secret = Uint8Array.from(require("../keys/verifier1.json"));
  const verifier2Secret = Uint8Array.from(require("../keys/verifier2.json"));
  const operatorSecret = Uint8Array.from(require("../keys/operator.json"));
  const nomeSecret = Uint8Array.from(require("../keys/nome.json"));
  const tokenSecret = Uint8Array.from(require("../keys/token.json"));

  const admin = Keypair.fromSecretKey(adminSecret);
  const organizer = Keypair.fromSecretKey(organizerSecret);
  const platform = Keypair.fromSecretKey(platformSecret);
  const deployer = Keypair.fromSecretKey(deployerSecret);
  const verifier1 = Keypair.fromSecretKey(verifier1Secret);
  const verifier2 = Keypair.fromSecretKey(verifier2Secret);
  const operator = Keypair.fromSecretKey(operatorSecret);
  const nome = Keypair.fromSecretKey(nomeSecret);
  const token = Keypair.fromSecretKey(tokenSecret);

  return {
    admin,
    organizer,
    platform,
    deployer,
    verifier1,
    verifier2,
    operator,
    nome,
    token
  };
}

export async function getUserRole(user: PublicKey) {
  const program = getProgram();
  const rolePda = getGenomePda([getConstant("role"), user.toBuffer()]);
  const userRole = await program.account.roleInfo.fetch(rolePda);
  return userRole.roles;
}

export function checkAnchorError(error: any, errMsg: string) {
  let errorMessage: string;
  if (error instanceof AnchorError) {
    errorMessage = error.error.errorMessage;
  } else {
    errorMessage = error.message;
  }
  assert.ok(errorMessage.includes(errMsg));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createGenomeMint() {
  let { admin, token } = getKeyPairs();

  const mint = await createMint(
    getProvider().connection,
    admin,
    admin.publicKey,
    null,
    6,
    token,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("Genome mint:", mint.toBase58());
}
