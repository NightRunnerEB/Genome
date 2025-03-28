import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { assert } from "chai";

export function getProvider() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  return provider;
}

export function getKeyPairs(): {
  admin: Keypair,
  organizer: Keypair,
  platform: Keypair,
  deployer: Keypair,
  verifier1: Keypair,
  verifier2: Keypair,
  verifier3: Keypair,
  operator: Keypair,
  nome: Keypair
} {
  const adminSecret = Uint8Array.from(require("../keys/admin.json"));
  const organizerSecret = Uint8Array.from(require("../keys/organizer.json"));
  const platformSecret = Uint8Array.from(require("../keys/platform_wallet.json"));
  const deployerSecret = Uint8Array.from(require("../keys/deployer.json"));
  const verifier1Secret = Uint8Array.from(require("../keys/verifier1.json"));
  const verifier2Secret = Uint8Array.from(require("../keys/verifier2.json"));
  const verifier3Secret = Uint8Array.from(require("../keys/verifier3.json"));
  const operatorSecret = Uint8Array.from(require("../keys/operator.json"));
  const nomeSecret = Uint8Array.from(require("../keys/nome.json"));

  const admin = Keypair.fromSecretKey(adminSecret);
  const organizer = Keypair.fromSecretKey(organizerSecret);
  const platform = Keypair.fromSecretKey(platformSecret);
  const deployer = Keypair.fromSecretKey(deployerSecret);
  const verifier1 = Keypair.fromSecretKey(verifier1Secret);
  const verifier2 = Keypair.fromSecretKey(verifier2Secret);
  const verifier3 = Keypair.fromSecretKey(verifier3Secret);
  const operator = Keypair.fromSecretKey(operatorSecret);
  const nome = Keypair.fromSecretKey(nomeSecret);

  return {
    admin,
    organizer,
    platform,
    deployer,
    verifier1,
    verifier2,
    verifier3,
    operator,
    nome
  };
}

export function getConfigPda(): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  const genomeRootArray = JSON.parse(genomeProgram.idl.constants[1].value);
  const genomeRootBuffer = Buffer.from(genomeRootArray);
  const configArray = JSON.parse(genomeProgram.idl.constants[0].value);
  const configBuffer = Buffer.from(configArray);
  return PublicKey.findProgramAddressSync(
    [genomeRootBuffer, configBuffer],
    genomeProgram.programId
  )[0];
}

export function getUserRolePda(
  seed: any
): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  const genomeRootArray = JSON.parse(genomeProgram.idl.constants[1].value);
  const genomeRootBuffer = Buffer.from(genomeRootArray);
  const roleArray = JSON.parse(genomeProgram.idl.constants[2].value);
  const roleBuffer = Buffer.from(roleArray);
  const seedBuffer = Buffer.from(seed);
  return PublicKey.findProgramAddressSync(
    [genomeRootBuffer, roleBuffer, seedBuffer],
    genomeProgram.programId
  )[0];
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

export function checkAnchorError(error: any, errMsg: string) {
  let errorMessage: string;
  if (error instanceof anchor.AnchorError) {
    errorMessage = error.error.errorMessage;
  } else {
    errorMessage = error.message;
  }
  assert.ok(errorMessage.includes(errMsg));
}
