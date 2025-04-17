import { approveChecked, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { AnchorError } from "@coral-xyz/anchor";
import { assert } from "chai";

import { getProvider } from "../common/utils";

const DEPLOYER_PATH = "./keys/deployer.json";
const ADMIN_PATH = "./keys/admin.json";
const ATTACKER_PATH = "./keys/attacker.json";
const ORGANIZER_PATH = "./keys/organizer.json";
const SPONSOR_PATH = "./keys/sponsor.json";
const TOKEN_PATH = "./keys/token.json";
const PLATFORM_PATH = "./keys/platform_wallet.json";
const VERIFIER1_PATH = "./keys/verifier1.json";
const VERIFIER2_PATH = "./keys/verifier2.json";
const VERIFIER3_PATH = "./keys/verifier3.json";
const OPERATOR_PATH = "./keys/operator.json";
const NOME_PATH = "./keys/nome.json";
const CAPTAIN1_PATH = "./keys/captain1.json";
const CAPTAIN2_PATH = "./keys/captain2.json";
const PARTICIPANT1_PATH = "./keys/participant1.json";
const PARTICIPANT2_PATH = "./keys/participant2.json";

export const MARKS = {
  // Run using `anchor run test-single`
  required: "required",
  // Run using `anchor run test-all`
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
  sponsor: Keypair,
  deployer: Keypair,
  token: Keypair,
  platform: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  verifier3: Keypair,
  operator: Keypair,
  nome: Keypair,
  captain1: Keypair,
  captain2: Keypair,
  participant1: Keypair,
  participant2: Keypair,
}> {
  const attacker = await getKeypairFromFile(ATTACKER_PATH);
  const admin = await getKeypairFromFile(ADMIN_PATH);
  const organizer = await getKeypairFromFile(ORGANIZER_PATH);
  const sponsor = await getKeypairFromFile(SPONSOR_PATH);
  const deployer = await getKeypairFromFile(DEPLOYER_PATH);
  const token = await getKeypairFromFile(TOKEN_PATH);
  const platform = await getKeypairFromFile(PLATFORM_PATH);
  const verifier1 = await getKeypairFromFile(VERIFIER1_PATH);
  const verifier2 = await getKeypairFromFile(VERIFIER2_PATH);
  const verifier3 = await getKeypairFromFile(VERIFIER3_PATH);
  const operator = await getKeypairFromFile(OPERATOR_PATH);
  const nome = await getKeypairFromFile(NOME_PATH);
  const participant1 = await getKeypairFromFile(PARTICIPANT1_PATH);
  const participant2 = await getKeypairFromFile(PARTICIPANT2_PATH);
  const captain1 = await getKeypairFromFile(CAPTAIN1_PATH);
  const captain2 = await getKeypairFromFile(CAPTAIN2_PATH);

  return { attacker, admin, organizer, sponsor, deployer, token, platform, verifier1, verifier2, verifier3, operator, nome, captain1, captain2, participant1, participant2 };
}

export async function createGenomeMint(): Promise<void> {
  const { admin, operator, organizer, verifier1, verifier2, verifier3, nome } = await getKeyPairs();
  const recipients = [operator, organizer, admin, verifier1, verifier2, verifier3];
  const connection = getProvider().connection;

  const nomeMint = await createMint(
    connection,
    admin,
    admin.publicKey,
    null,
    9,
    nome,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("Genome mint:", nomeMint.toBase58());

  for (const recipient of recipients) {
    const ata = await createAssociatedTokenAccount(
      connection,
      recipient,
      nomeMint,
      recipient.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await mintTo(
      connection,
      recipient,
      nomeMint,
      ata,
      admin,
      100000000000,
      [],
      {},
      TOKEN_PROGRAM_ID
    );
  }
}

export async function createTournamentMint(): Promise<{
  assetMint: PublicKey;
  sponsorAta: PublicKey;
}> {
  const {
    admin,
    sponsor,
    organizer,
    captain1,
    captain2,
    participant1,
    participant2,
    token,
  } = await getKeyPairs();

  const connection = getProvider().connection;

  const assetMint = await createMint(
    connection,
    admin,
    admin.publicKey,
    null,
    9,
    token,
    undefined,
    TOKEN_PROGRAM_ID
  );

  const sponsorAta = await createAssociatedTokenAccount(
    connection,
    sponsor,
    token.publicKey,
    sponsor.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  await mintTo(
    connection,
    sponsor,
    token.publicKey,
    sponsorAta,
    admin,
    1000000000000000,
    [],
    {},
    TOKEN_PROGRAM_ID
  );

  const otherAccounts = [
    organizer,
    captain1,
    captain2,
    participant1,
    participant2,
  ];

  for (const account of otherAccounts) {
    const ata = await createAssociatedTokenAccount(
      connection,
      account,
      token.publicKey,
      account.publicKey,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    await mintTo(
      connection,
      account,
      token.publicKey,
      ata,
      admin,
      1000000000000000,
      [],
      {},
      TOKEN_PROGRAM_ID
    );
  }

  return { assetMint, sponsorAta };
}

export async function delegateAccount(sponsorAta: PublicKey): Promise<String> {
  let provider = getProvider();
  let { admin, sponsor, organizer, token } = await getKeyPairs();
  return approveChecked(
    provider.connection,
    admin,
    token.publicKey,
    sponsorAta,
    organizer.publicKey,
    sponsor,
    1e8,
    9,
    [],
    {},
    TOKEN_PROGRAM_ID
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
