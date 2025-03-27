import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Account as SplTokenAccount,
  createAssociatedTokenAccount,
  approveChecked,
  mintTo,
  createMint,
} from "@solana/spl-token";
import { GenomeContract } from "../target/types/genome_contract";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { assert } from "chai";

export const GENOME_ROOT = utf8.encode("genome");
export const CONFIG = utf8.encode("config");
export const TOURNAMENT = utf8.encode("tournament");
export const ROLE = utf8.encode("role");
export const TOKEN = utf8.encode("token");

export function getProvider() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  return provider;
}

export function getKeyPairs(): {
  admin: Keypair,
  organizer: Keypair,
  sponsor: Keypair,
  deployer: Keypair,
  token: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  verifier3: Keypair,
  operator: Keypair,
  nome: Keypair
} {
  const adminSecret = Uint8Array.from(require("../keys/admin.json"));
  const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
  const sponsorSecret = Uint8Array.from(require("../keys/sponsor.json"));
  const deployerSecret = Uint8Array.from(require("../keys/deployer.json"));
  const tokenSecret = Uint8Array.from(require("../keys/token.json"));
  const verifier1Secret = Uint8Array.from(require("../keys/verifier1.json"));
  const verifier2Secret = Uint8Array.from(require("../keys/verifier2.json"));
  const verifier3Secret = Uint8Array.from(require("../keys/verifier3.json"));
  const operatorSecret = Uint8Array.from(require("../keys/operator.json"));
  const nomeSecret = Uint8Array.from(require("../keys/nome.json"));

  const admin = Keypair.fromSecretKey(adminSecret);
  const organizer = Keypair.fromSecretKey(organizerSecret);
  const sponsor = Keypair.fromSecretKey(sponsorSecret);
  const deployer = Keypair.fromSecretKey(deployerSecret);
  const token = Keypair.fromSecretKey(tokenSecret);
  const verifier1 = Keypair.fromSecretKey(verifier1Secret);
  const verifier2 = Keypair.fromSecretKey(verifier2Secret);
  const verifier3 = Keypair.fromSecretKey(verifier3Secret);
  const operator = Keypair.fromSecretKey(operatorSecret);
  const nome = Keypair.fromSecretKey(nomeSecret);

  return {
    admin,
    organizer,
    sponsor,
    deployer,
    token,
    verifier1,
    verifier2,
    verifier3,
    operator,
    nome
  };
}

export function getGenomePda(): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, CONFIG],
    genomeProgram.programId
  )[0];
}

export function getTournamentPda(
  seeds: Uint8Array<ArrayBufferLike>
): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, TOURNAMENT].concat(seeds),
    genomeProgram.programId
  )[0];
}

export function getUserRolePda(
  seeds: Uint8Array<ArrayBufferLike>
): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, ROLE].concat(seeds),
    genomeProgram.programId
  )[0];
}

export function getTokenInfoPda(
  seeds: Uint8Array<ArrayBufferLike>
): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, TOKEN].concat(seeds),
    genomeProgram.programId
  )[0];
}

export async function getPrizePoolAta(
  mint: PublicKey,
  authority: PublicKey
): Promise<SplTokenAccount> {
  const prizePoolAta = await getAssociatedTokenAddress(
    mint,
    authority,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const provider = getProvider();
  return getAccount(
    provider.connection,
    prizePoolAta,
    undefined,
    TOKEN_PROGRAM_ID
  );
}

export async function getSponsorAta(
  sponsorPoolAta: PublicKey
): Promise<SplTokenAccount> {
  const provider = getProvider();
  return getAccount(
    provider.connection,
    sponsorPoolAta,
    undefined,
    TOKEN_PROGRAM_ID
  );
}

export async function airdrop(address: PublicKey, amount: number) {
  const provider = getProvider();

  let txid = await provider.connection.requestAirdrop(
    address,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );
  let { blockhash, lastValidBlockHeight } =
    await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({
    signature: txid,
    blockhash,
    lastValidBlockHeight,
  });
}

export async function createGenomeMint(): Promise<{
  assetMint: PublicKey;
  sponsorAta: PublicKey;
}> {
  let { admin, sponsor, organizer, token } = getKeyPairs();

  const assetMint = await createMint(
    getProvider().connection,
    admin,
    admin.publicKey,
    null,
    6,
    token,
    undefined,
    TOKEN_PROGRAM_ID
  );
  console.log("Genome mint:", assetMint.toBase58());

  const sponsorAta = await createAssociatedTokenAccount(
    getProvider().connection,
    admin,
    token.publicKey,
    sponsor.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Sponsor genome ata:", sponsorAta.toBase58());

  const reward_pool_ata = await createAssociatedTokenAccount(
    getProvider().connection,
    admin,
    token.publicKey,
    organizer.publicKey,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Tournament pool ata:", reward_pool_ata.toBase58());

  let tx = await mintTo(
    getProvider().connection,
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
    6,
    [],
    {},
    TOKEN_PROGRAM_ID
  );
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
