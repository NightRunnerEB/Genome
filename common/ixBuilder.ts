import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { GenomeSolana } from "../target/types/genome_solana";

import { getConstant, getGenomePda, getProgram, getSingleConfig } from "./utils";

export class IxBuilder {
  public program: Program<GenomeSolana>;
  private omniConfigSeed: Uint8Array;
  private singleConfigSeed: Uint8Array;
  private roleSeed: Uint8Array;
  private platformSeed: Uint8Array;

  constructor() {
    this.program = getProgram();
    this.singleConfigSeed = getConstant("singleConfig");
    this.omniConfigSeed = getConstant("omniConfig");
    this.roleSeed = getConstant("role");
    this.platformSeed = getConstant("platform");
  }

  async initializeOmnichainIx(
    deployer: PublicKey,
    configData: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .initializeOmni(configData)
      .accountsStrict({
        deployer,
        omniConfig: await getGenomePda([this.omniConfigSeed]),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async setBridgeFeeIx(
    admin: PublicKey,
    bridgeFee: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .setBridgeFee(bridgeFee)
      .accountsStrict({
        admin,
        omniConfig: await getGenomePda([this.omniConfigSeed]),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async initializeSingleIx(
    deployer: PublicKey,
    configData: any
  ): Promise<TransactionInstruction> {
    const platformWalletPda = await getGenomePda([this.platformSeed]);
    const platformPoolAta = await getAssociatedTokenAddress(
      configData.nomeMint,
      platformWalletPda,
      true
    );
    const configPda = await getGenomePda([this.singleConfigSeed]);
    return this.program.methods
      .initialize(configData)
      .accountsStrict({
        deployer,
        config: configPda,
        platformPoolAta: platformPoolAta,
        nomeMint: configData.nomeMint,
        platformWallet: platformWalletPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async grantRoleIx(
    admin: PublicKey,
    user: PublicKey,
    params: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .grantRole(params)
      .accountsStrict({
        admin,
        user,
        roleInfo: await getGenomePda([this.roleSeed, user.toBuffer()]),
        config: await getGenomePda([this.singleConfigSeed]),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async revokeRoleIx(
    admin: PublicKey,
    user: PublicKey,
    role: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .revokeRole(role)
      .accountsStrict({
        admin,
        user,
        roleInfo: await getGenomePda([this.roleSeed, user.toBuffer()]),
        config: await getGenomePda([this.singleConfigSeed]),
      })
      .instruction();
  }
}
