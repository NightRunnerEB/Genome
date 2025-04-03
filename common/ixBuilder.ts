import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { GenomeContract } from "../target/types/genome_contract";

import { getConstant, getGenomePda, getProgram } from "./utils";

const PROGRAM = getProgram();

export class IxBuilder {
  public program: Program<GenomeContract>;
  public configPda: PublicKey;
  private roleSeed: Uint8Array;
  private tokenSeed: Uint8Array;

  constructor() {
    this.program = PROGRAM;
    this.configPda = getGenomePda([getConstant("config")]);
    this.roleSeed = getConstant("role");
    this.tokenSeed = getConstant("token");
  }

  async initializeIx(
    deployer: PublicKey,
    configData: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .initialize(configData)
      .accountsStrict({
        deployer,
        config: this.configPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async createTournamentIx(
    organizer: PublicKey,
    sponsor: PublicKey,
    mint: PublicKey,
    params: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .createTournament(params)
      .accounts({
        organizer: organizer,
        sponsor: sponsor,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
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
        roleInfo: getGenomePda([this.roleSeed, user.toBuffer()]),
        config: this.configPda,
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
        roleInfo: getGenomePda([this.roleSeed, user.toBuffer()]),
        config: this.configPda,
      })
      .instruction();
  }

  async approveTokenIx(
    operator: PublicKey,
    assetMint: PublicKey,
    minSponsorPool: any,
    minEntryFee: any
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .approveToken(minSponsorPool, minEntryFee)
      .accountsStrict({
        operator,
        assetMint,
        roleInfo: getGenomePda([this.roleSeed, operator.toBuffer()]),
        tokenInfo: getGenomePda([this.tokenSeed, assetMint.toBuffer()]),
        systemProgram: SystemProgram.programId
      })
      .instruction();
  }

  async banTokenIx(
    operator: PublicKey,
    assetMint: PublicKey,
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .banToken()
      .accountsStrict({
        operator,
        assetMint,
        roleInfo: getGenomePda([this.roleSeed, operator.toBuffer()]),
        tokenInfo: getGenomePda([this.tokenSeed, assetMint.toBuffer()]),
      })
      .instruction();
  }
}
