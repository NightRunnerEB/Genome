import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { GenomeSolana } from "../target/types/genome_solana";

import { getConstant, getGenomePda, getProgram } from "./utils";

const PROGRAM = getProgram();

export class IxBuilder {
  public program: Program<GenomeSolana>;
  private singleConfigSeed: Uint8Array;
  private roleSeed: Uint8Array;
  private tokenSeed: Uint8Array;
  private omniConfig: Uint8Array;

  constructor() {
    this.program = PROGRAM;
    this.singleConfigSeed = getConstant("singleConfig");
    this.omniConfig = getConstant("omniConfigSeed");
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
        omniConfig: await getGenomePda([this.omniConfig]),
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
        omniConfig: await getGenomePda([this.omniConfig]),
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
    const tournamentPda = await getGenomePda([getConstant("tournament"), idBuffer]);
    const bloomPda = await getGenomePda([getConstant("bloom"), idBuffer]);
    const rolePda = await getGenomePda([getConstant("role"), organizer.toBuffer()]);
    const tokenPda = await getGenomePda([getConstant("token"), assetMint.toBuffer()]);

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
}
