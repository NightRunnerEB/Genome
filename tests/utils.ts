import { AnchorError } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { getConstant, getGenomePda, getProgram, getProvider } from "../common/utils";
import { approveChecked, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createMint, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export function getKeyPairs(): {
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
} {
  const adminSecret = Uint8Array.from(require("../keys/admin.json"));
  const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
  const sponsorSecret = Uint8Array.from(require("../keys/sponsor.json"));
  const deployerSecret = Uint8Array.from(require("../keys/deployer.json"));
  const tokenSecret = Uint8Array.from(require("../keys/token.json"));
  const platformSecret = Uint8Array.from(require("../keys/platform_wallet.json"));
  const verifier1Secret = Uint8Array.from(require("../keys/verifier1.json"));
  const verifier2Secret = Uint8Array.from(require("../keys/verifier2.json"));
  const operatorSecret = Uint8Array.from(require("../keys/operator.json"));
  const nomeSecret = Uint8Array.from(require("../keys/nome.json"));

  const admin = Keypair.fromSecretKey(adminSecret);
  const organizer = Keypair.fromSecretKey(organizerSecret);
  const sponsor = Keypair.fromSecretKey(sponsorSecret);
  const deployer = Keypair.fromSecretKey(deployerSecret);
  const token = Keypair.fromSecretKey(tokenSecret);
  const platform = Keypair.fromSecretKey(platformSecret);
  const verifier1 = Keypair.fromSecretKey(verifier1Secret);
  const verifier2 = Keypair.fromSecretKey(verifier2Secret);
  const operator = Keypair.fromSecretKey(operatorSecret);
  const nome = Keypair.fromSecretKey(nomeSecret);

  return {
    admin,
    organizer,
    sponsor,
    deployer,
    token,
    platform,
    verifier1,
    verifier2,
    operator,
    nome
  };
}

export async function getUserRole(user: PublicKey) {
  const program = getProgram();
  const rolePda = getGenomePda([getConstant("role"), user.toBuffer()]);
  const userRole = await program.account.roleInfo.fetch(rolePda);
  return userRole.roles;
}

export async function createGenomeMint():Promise<{
  organizerAta: PublicKey;
  platformAta: PublicKey;
}> {
  let { admin, organizer, operator, nome, platform } = getKeyPairs();

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
  let { admin, sponsor, organizer, token } = getKeyPairs();

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
  let { admin, sponsor, organizer, token } = getKeyPairs();
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
