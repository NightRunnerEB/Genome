import { BN } from "@coral-xyz/anchor";
import { approveChecked, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorError } from "@coral-xyz/anchor";
import { assert } from "chai";

import { getProgram, getConstant, getGenomePda, getProvider } from "../common/utils";
import { getKeypairFromFile } from "@solana-developers/helpers";

const DEPLOYER_PATH = "./keys/deployer.json";
const ADMIN_PATH = "./keys/admin.json";
const ATTACKER_PATH = "./keys/attacker.json";
const ORGANIZER_PATH = "./keys/organizer.json";
const SPONSOR_PATH = "./keys/sponsor.json";
const TOKEN_PATH = "./keys/token.json";
const PLATFORM_PATH = "./keys/platform_wallet.json";
const VERIFIER1_PATH = "./keys/verifier1.json";
const VERIFIER2_PATH = "./keys/verifier2.json";
const OPERATOR_PATH = "./keys/operator.json";
const NOME_PATH = "./keys/nome.json";

export const MARKS = {
  // Run using `anchor test`
  required: "required",
  // Run using `anchor run test-all`
  negative: "negative",
};

export interface TournamentConfig {
  organizer: PublicKey;
  organizerFee: BN;
  expirationTime: BN;
  sponsorPool: BN;
  entryFee: BN;
  teamSize: number;
  minTeams: number;
  maxTeams: number;
  assetMint: PublicKey;
}

export interface GenomeSingleConfig {
  admin: PublicKey;
  verifierAddresses: PublicKey[];
  consensusRate: number;
  platformWallet: PublicKey;
  nomeMint: PublicKey;
  falsePrecision: number;
  platformFee: BN;
  maxOrganizerFee: BN;
  minTeams: number;
  maxTeams: number;
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
  operator: Keypair,
  nome: Keypair
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
  const operator = await getKeypairFromFile(OPERATOR_PATH);
  const nome = await getKeypairFromFile(NOME_PATH);

  return { attacker, admin, organizer, sponsor, deployer, token, platform, verifier1, verifier2, operator, nome };
}

export async function getUserRole(user: PublicKey) {
  const program = getProgram();
  const rolePda = await getGenomePda([getConstant("role"), user.toBuffer()]);
  const userRole = await program.account.roleInfo.fetch(rolePda);
  return userRole.roles;
}

export async function createGenomeMint(): Promise<{
  organizerAta: PublicKey;
  platformAta: PublicKey;
}> {
  let { admin, organizer, operator, nome, platform } = await getKeyPairs();

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

  const platformAta = await createAssociatedTokenAccount(
    connection,
    admin,
    nome.publicKey,
    platform.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Platform genome ata:", platformAta.toBase58());

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

  return { organizerAta, platformAta };
}

export async function createTournamentMint(): Promise<{
  assetMint: PublicKey;
  sponsorAta: PublicKey;
}> {
  let { admin, sponsor, organizer, token } = await getKeyPairs();

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
  console.log("Token mint:", assetMint.toBase58());

  const sponsorAta = await createAssociatedTokenAccount(
    connection,
    admin,
    token.publicKey,
    sponsor.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Sponsor token ata:", sponsorAta.toBase58());

  const reward_pool_ata = await createAssociatedTokenAccount(
    connection,
    admin,
    token.publicKey,
    organizer.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Tournament pool ata:", reward_pool_ata.toBase58());

  let tx = await mintTo(
    connection,
    admin,
    token.publicKey,
    sponsorAta,
    admin,
    1000000000000000,
    [],
    {},
    TOKEN_PROGRAM_ID
  );
  console.log("Mint to sponsor tx:", tx);

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
