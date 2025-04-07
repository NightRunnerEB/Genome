import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { GenomeSolana } from "../target/types/genome_solana";

import { getConstant, getGenomePda, getProgram } from "./utils";

export class IxBuilder {
  public program: Program<GenomeSolana>;
  private singleConfigSeed: Uint8Array;
  private tournamentSeed: Uint8Array;
  private bloomSeed: Uint8Array;
  private roleSeed: Uint8Array;
  private tokenSeed: Uint8Array;
  private omniConfigSeed: Uint8Array;

  constructor() {
    this.program = getProgram();
    this.singleConfigSeed = getConstant("singleConfig");
    this.omniConfigSeed = getConstant("omniConfig");
    this.tournamentSeed = getConstant("tournament");
    this.bloomSeed = getConstant("bloom");
    this.roleSeed = getConstant("role");
    this.tokenSeed = getConstant("token");
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
    return this.program.methods
      .initialize(configData)
      .accountsStrict({
        deployer,
        config: await getGenomePda([this.singleConfigSeed]),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async createTournamentIx(
    organizer: PublicKey,
    sponsor: PublicKey,
    assetMint: PublicKey,
    params: any
  ): Promise<TransactionInstruction> {
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const configData = await this.program.account.genomeSingleConfig.fetch(configPda);
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(configData.tournamentNonce, 0);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const bloomPda = await getGenomePda([this.bloomSeed, idBuffer]);
    const rolePda = await getGenomePda([this.roleSeed, organizer.toBuffer()]);
    const tokenPda = await getGenomePda([this.tokenSeed, assetMint.toBuffer()]);
    const prizePoolAta = await getAssociatedTokenAddress(assetMint, tournamentPda, true);
    const sponsorAta = await getAssociatedTokenAddress(assetMint, sponsor, true);
    const platformPoolAta = await getAssociatedTokenAddress(configData.nomeMint, configData.platformWallet, true);
    const organizerAta = await getAssociatedTokenAddress(configData.nomeMint, organizer, true);

    return this.program.methods
      .createTournament(params)
      .accountsStrict({
        organizer,
        sponsor,
        config: configPda,
        roleInfo: rolePda,
        tournament: tournamentPda,
        assetMint,
        nomeMint: configData.nomeMint,
        tokenInfo: tokenPda,
        prizePoolAta,
        sponsorAta,
        organizerAta,
        platformPoolAta,
        bloomFilter: bloomPda,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
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
        roleInfo: await getGenomePda([this.roleSeed, operator.toBuffer()]),
        tokenInfo: await getGenomePda([this.tokenSeed, assetMint.toBuffer()]),
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
        roleInfo: await getGenomePda([this.roleSeed, operator.toBuffer()]),
        tokenInfo: await getGenomePda([this.tokenSeed, assetMint.toBuffer()]),
      })
      .instruction();
  }

  async setBloomPrecisionIx(
    admin: PublicKey,
    newPrecision: number
  ): Promise<TransactionInstruction> {
    return this.program.methods
      .setBloomPrecision(newPrecision)
      .accountsStrict({
        admin,
        config: await getGenomePda([this.singleConfigSeed]),
      })
      .instruction();
  }
}
