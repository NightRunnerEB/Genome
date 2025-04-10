import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorError } from "@coral-xyz/anchor";
import { assert } from "chai";

import { getProvider } from "../common/utils";
import { getKeypairFromFile } from "@solana-developers/helpers";

const DEPLOYER_PATH = "./keys/deployer.json";
const ADMIN_PATH = "./keys/admin.json";
const ATTACKER_PATH = "./keys/attacker.json";
const ORGANIZER_PATH = "./keys/organizer.json";
const VERIFIER1_PATH = "./keys/verifier1.json";
const VERIFIER2_PATH = "./keys/verifier2.json";
const OPERATOR_PATH = "./keys/operator.json";
const NOME_PATH = "./keys/nome.json";

export const MARKS = {
  // Run using `anchor run test-single`
  required: "required",
  // Run using `anchor run test-single-all`
  negative: "negative",
};

export function checkAnchorError(error: any, errMsg: string) {
  let errorMessage: string;
  if (error instanceof AnchorError) {
    errorMessage = error.error.errorMessage;
  } else {
    errorMessage = error.message;
  }
  assert.ok(errorMessage.includes(errMsg));
}

export async function getKeyPairs(): Promise<{
  attacker: Keypair;
  admin: Keypair,
  organizer: Keypair,
  deployer: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  operator: Keypair,
  nome: Keypair,
}> {
  const attacker = await getKeypairFromFile(ATTACKER_PATH);
  const admin = await getKeypairFromFile(ADMIN_PATH);
  const organizer = await getKeypairFromFile(ORGANIZER_PATH);
  const deployer = await getKeypairFromFile(DEPLOYER_PATH);
  const verifier1 = await getKeypairFromFile(VERIFIER1_PATH);
  const verifier2 = await getKeypairFromFile(VERIFIER2_PATH);
  const operator = await getKeypairFromFile(OPERATOR_PATH);
  const nome = await getKeypairFromFile(NOME_PATH);

  return { attacker, admin, organizer, deployer, verifier1, verifier2, operator, nome };
}

export async function createGenomeMint(): Promise<{
  organizerAta: PublicKey;
}> {
  let { admin, organizer, operator, nome } = await getKeyPairs();

  const connection = getProvider().connection;

  const assetMint = await createMint(
    connection,
    admin,
    admin.publicKey,
    null,
    9,
    nome,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("Genome mint:", assetMint.toBase58());

  const organizerAta = await createAssociatedTokenAccount(
    connection,
    admin,
    nome.publicKey,
    organizer.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Organizer genome ata:", organizerAta.toBase58());

  const operatorAta = await createAssociatedTokenAccount(
    connection,
    admin,
    nome.publicKey,
    operator.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Operator genome ata:", operatorAta.toBase58());

  let tx = await mintTo(
    connection,
    admin,
    nome.publicKey,
    organizerAta,
    admin,
    1000000000000000,
    [],
    {},
    TOKEN_PROGRAM_ID
  );
  console.log("Mint to organizer tx:", tx)

  return { organizerAta };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

