import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { GenomeSolana } from "../target/types/genome_solana";

import { GENOME_OMNI_CONFIG, GENOME_SINGLE_CONFIG, getConstant, getGenomePda, getProgram, getSingleConfig, getTournament, ROLE, TEAM, TOKEN, TOURNAMENT } from "./utils";

export class IxBuilder {
  public program: Program<GenomeSolana>;
  private singleConfigSeed: Uint8Array;
  private tournamentSeed: Uint8Array;
  private teamSeed: Uint8Array;
  private finishSeed: Uint8Array;
  private bloomSeed: Uint8Array;
  private roleSeed: Uint8Array;
  private tokenSeed: Uint8Array;
  private omniConfigSeed: Uint8Array;
  private consensusSeed: Uint8Array;
  private platformSeed: Uint8Array;

  constructor() {
    this.program = getProgram();
    this.singleConfigSeed = GENOME_SINGLE_CONFIG;
    this.omniConfigSeed = GENOME_OMNI_CONFIG;
    this.tournamentSeed = TOURNAMENT;
    this.teamSeed = TEAM;
    this.roleSeed = ROLE;
    this.tokenSeed = TOKEN;
    this.bloomSeed = getConstant("bloom");
    this.finishSeed = getConstant("finish");
    this.consensusSeed = getConstant("consensus");
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
    const finishMetaDataPda = await getGenomePda([this.finishSeed, idBuffer]);
    const consensusPda = await getGenomePda([this.consensusSeed, idBuffer])
    const bloomPda = await getGenomePda([this.bloomSeed, idBuffer]);
    const rolePda = await getGenomePda([this.roleSeed, organizer.toBuffer()]);
    const tokenPda = await getGenomePda([this.tokenSeed, assetMint.toBuffer()]);
    const rewardPoolAta = await getAssociatedTokenAddress(assetMint, tournamentPda, true);
    const sponsorAta = await getAssociatedTokenAddress(assetMint, sponsor, true);
    const platformAta = await getAssociatedTokenAddress(configData.nomeMint, configData.platformWallet, true);
    const organizerAta = await getAssociatedTokenAddress(configData.nomeMint, organizer, true);

    return this.program.methods
      .createTournament(params)
      .accountsStrict({
        organizer,
        sponsor,
        config: configPda,
        roleInfo: rolePda,
        tournament: tournamentPda,
        consensus: consensusPda,
        finishMetaData: finishMetaDataPda,
        assetMint,
        nomeMint: configData.nomeMint,
        tokenInfo: tokenPda,
        rewardPoolAta,
        sponsorAta,
        organizerAta,
        platformAta,
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

  async registerTournamentIx(
    registerParams: any,
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(registerParams.tournamentId, 0);
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const tournament = await getTournament(registerParams.tournamentId);
    const teamPda = await getGenomePda([this.teamSeed, idBuffer, registerParams.captain.toBuffer()]);
    const bloomPda = await getGenomePda([this.bloomSeed, idBuffer]);

    const participantAta = await getAssociatedTokenAddress(tournament.config.assetMint, registerParams.participant, true);
    const rewardPoolAta = await getAssociatedTokenAddress(tournament.config.assetMint, tournamentPda, true);

    return this.program.methods
      .registerTournament(registerParams)
      .accountsStrict({
        participant: registerParams.participant,
        config: configPda,
        tournament: tournamentPda,
        team: teamPda,
        mint: tournament.config.assetMint,
        participantAta,
        rewardPoolAta,
        bloomFilter: bloomPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
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

  async startTournamentIx(
    verifier: PublicKey,
    tournamentId: number,
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const consensusPda = await getGenomePda([this.consensusSeed, idBuffer]);
    const rolePda = await getGenomePda([this.roleSeed, verifier.toBuffer()]);
    return this.program.methods
      .startTournament(tournamentId)
      .accountsStrict({
        verifier,
        roleInfo: rolePda,
        config: configPda,
        consensus: consensusPda,
        tournament: tournamentPda,
      })
      .instruction();
  }

  async cancelTournamentIx(
    verifier: PublicKey,
    tournamentId: number,
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const consensusPda = await getGenomePda([this.consensusSeed, idBuffer]);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const roleVerPda = await getGenomePda([this.roleSeed, verifier.toBuffer()]);
    const tournament = await getTournament(tournamentId);
    const roleOrgPda = await getGenomePda([this.roleSeed, tournament.organizer.toBuffer()]);
    return this.program.methods
      .cancelTournament(tournamentId)
      .accountsStrict({
        verifier,
        roleInfoVer: roleVerPda,
        config: configPda,
        consensus: consensusPda,
        tournament: tournamentPda,
        roleInfoOrg: roleOrgPda,
      })
      .instruction();
  }

  async finishTournamentIx(
    verifier: PublicKey,
    tournamentId: number,
    captainWinners: PublicKey[]
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const consensusPda = await getGenomePda([this.consensusSeed, idBuffer]);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const tournament = await getTournament(tournamentId);
    const assetMint = tournament.config.assetMint;
    const rewardPoolAta = await getAssociatedTokenAddress(tournament.config.assetMint, tournamentPda, true);
    const organizerAta = await getAssociatedTokenAddress(tournament.config.assetMint, tournament.organizer, true);
    const rolePda = await getGenomePda([this.roleSeed, verifier.toBuffer()]);
    const finishMetaDataPda = await getGenomePda([this.finishSeed, idBuffer]);
    return this.program.methods
      .finishTournament(tournamentId, captainWinners)
      .accountsStrict({
        verifier,
        organizer: tournament.organizer,
        roleInfo: rolePda,
        config: configPda,
        consensus: consensusPda,
        tournament: tournamentPda,
        assetMint,
        finishMetaData: finishMetaDataPda,
        organizerAta,
        rewardPoolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async claimRewardIx(
    participant: PublicKey,
    tournamentId: number,
    captain: PublicKey
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const teamPda = await getGenomePda([this.teamSeed, idBuffer, captain.toBuffer()]);
    const finishMetaDataPda = await getGenomePda([this.finishSeed, idBuffer]);
    const tournament = await getTournament(tournamentId);
    const assetMint = tournament.config.assetMint;
    const participantAta = await getAssociatedTokenAddress(assetMint, participant, true);
    const rewardPoolAta = await getAssociatedTokenAddress(assetMint, tournamentPda, true);
    return this.program.methods
      .claimReward(tournamentId, captain)
      .accountsStrict({
        participant,
        team: teamPda,
        tournament: tournamentPda,
        finishMetaData: finishMetaDataPda,
        assetMint,
        participantAta,
        rewardPoolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async claimRefundIx(
    participant: PublicKey,
    tournamentId: number,
    captain: PublicKey
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const teamPda = await getGenomePda([this.teamSeed, idBuffer, captain.toBuffer()]);
    const tournament = await getTournament(tournamentId);
    const assetMint = tournament.config.assetMint;
    const participantAta = await getAssociatedTokenAddress(assetMint, participant, true);
    const rewardPoolAta = await getAssociatedTokenAddress(assetMint, tournamentPda, true);
    return this.program.methods
      .claimRefund(tournamentId, captain)
      .accountsStrict({
        participant,
        tournament: tournamentPda,
        team: teamPda,
        assetMint,
        participantAta,
        rewardPoolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async claimRoleFundIx(
    claimer: PublicKey,
    amount: BN
  ): Promise<TransactionInstruction> {
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const roleInfoPda = await getGenomePda([this.roleSeed, claimer.toBuffer()]);
    const configData = await getSingleConfig();
    const claimerAta = await getAssociatedTokenAddress(configData.nomeMint, claimer, true);
    const platformWalletPda = await getGenomePda([this.platformSeed]);
    const platformAta = await getAssociatedTokenAddress(configData.nomeMint, platformWalletPda, true);
    return this.program.methods
      .claimRoleFund(amount)
      .accountsStrict({
        platformWallet: platformWalletPda,
        claimer,
        config: configPda,
        roleInfo: roleInfoPda,
        nomeMint: configData.nomeMint,
        claimerAta,
        platformAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async claimSponsorRefundIx(
    sponsor: PublicKey,
    tournamentId: number
  ): Promise<TransactionInstruction> {
    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    const tournamentPda = await getGenomePda([this.tournamentSeed, idBuffer]);
    const tournament = await getTournament(tournamentId);
    const assetMint = tournament.config.assetMint;
    const sponsorAta = await getAssociatedTokenAddress(assetMint, sponsor, true);
    const rewardPoolAta = await getAssociatedTokenAddress(assetMint, tournamentPda, true);
    return this.program.methods
      .claimSponsorRefund()
      .accountsStrict({
        sponsor,
        tournament: tournamentPda,
        assetMint,
        sponsorAta,
        rewardPoolAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async withdrawPlatformFeeIx(
    admin: PublicKey,
    amount: number
  ): Promise<TransactionInstruction> {
    const configPda = await getGenomePda([this.singleConfigSeed]);
    const platformWalletPda = await getGenomePda([this.platformSeed]);
    const configData = await getSingleConfig();
    const platformAta = await getAssociatedTokenAddress(
      configData.nomeMint,
      configData.platformWallet,
      true
    );
    const adminAta = await getAssociatedTokenAddress(
      configData.nomeMint,
      admin,
      true
    );
    return this.program.methods
      .withdraw(new BN(amount))
      .accountsStrict({
        admin,
        config: configPda,
        platformWallet: platformWalletPda,
        platformAta,
        adminAta,
        nomeMint: configData.nomeMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }
}
