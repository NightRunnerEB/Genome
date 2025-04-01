import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import {
  setProvider,
  workspace,
  Program,
  AnchorProvider,
  BN,
} from "@coral-xyz/anchor";

import { GenomeSolana } from "../target/types/genome_solana";

export const GENOME_OMNI_CONFIG = getConstant("omniConfigSeed");
const PROGRAM = getProgram();
const GENOME_ROOT = getConstant("genomeRoot");
const GENOME_PROGRAM_PATH = "./keys/genome-program.json";

export class IxBuilder {
  public program: Program<GenomeSolana> = PROGRAM;
  private omniConfig: Uint8Array = GENOME_OMNI_CONFIG;

  async initializeOmnichain(
    deployer: Keypair,
    configData: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .initializeOmni(configData)
      .accountsStrict({
        deployer: deployer.publicKey,
        omniConfig: await getGenomePda([this.omniConfig]),
        systemProgram: SystemProgram.programId,
      })
      .signers([deployer])
      .instruction();
  }

  async setBridgeFee(
    admin: Keypair,
    bridgeFee: BN
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .setBridgeFee(bridgeFee)
      .accountsStrict({
        admin: admin.publicKey,
        omniConfig: await getGenomePda([this.omniConfig]),
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .instruction();
  }
}

export async function buildAndSendTx(
  ixs: TransactionInstruction[],
  signers: Keypair[]
): Promise<string> {
  const program = getProgram();
  const tx = new Transaction().add(...ixs);
  return await sendAndConfirmTransaction(
    program.provider.connection,
    tx,
    signers
  );
}

export function getProgram(): Program<GenomeSolana> {
  const provider = AnchorProvider.env();
  setProvider(provider);
  return workspace.GenomeSolana as Program<GenomeSolana>;
}

export async function getGenomePda(
  seeds: Uint8Array<ArrayBufferLike>[]
): Promise<PublicKey> {
  const programKeypair = await getKeypairFromFile(GENOME_PROGRAM_PATH);
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT].concat(seeds),
    programKeypair.publicKey
  )[0];
}

function getConstant(name: string): Uint8Array {
  return JSON.parse(
    getProgram().idl.constants.find((obj) => obj.name == name).value
  );
}
