import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { getGonfigPda, getTournamentPda, getTeamPda } from "./utils";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class TxBuilder {
  public program: anchor.Program<GenomeContract>;

  constructor() {
    this.program = anchor.workspace
      .GenomeContract as anchor.Program<GenomeContract>;
  }

  async initialize(admin: Keypair, configData: any): Promise<string> {
    return this.program.methods
      .initialize(configData)
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();
  }

  async createTournamentSinglechain(
    organizer: Keypair,
    sponsor: Keypair,
    mint: PublicKey,
    params: any
  ): Promise<string> {
    return this.program.methods
      .createTournament(params)
      .accounts({
        organizer: organizer.publicKey,
        sponsor: sponsor.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([organizer])
      .rpc();
  }

  async registerTournament(
    payer: Keypair,
    mint: PublicKey,
    registerParams: any
  ): Promise<string> {
    return this.program.methods
      .registerTournament(registerParams)
      .accounts({
        participant: payer.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([payer])
      .rpc();
  }

  async setBloomPrecision(admin: Keypair, newPrecision: number): Promise<string> {
    return this.program.methods
      .setBloomPrecision(newPrecision)
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();
  }

  async getConfig() {
    let configPda = getGonfigPda();
    const config = await this.program.account.genomeConfig.fetch(configPda);
    return {
      admin: config.admin,
      tournamentNonce: config.tournamentNonce,
      platformFee: config.platformFee,
      platformWallet: config.platformWallet,
      falsePrecision: config.falsePrecision,
      minEntryFee: config.minEntryFee,
      minSponsorPool: config.minSponsorPool,
      minTeams: config.minTeams,
      maxTeams: config.maxTeams,
      maxOrganizerRoyalty: config.maxOrganizerRoyalty,
    };
  }

  async getTournament(
    tournamentNonce: number
  ) {
    const nonceBuffer = new Uint8Array(new Uint32Array([tournamentNonce]).buffer);
    let tournamentPda = getTournamentPda(nonceBuffer);
    const tournament = await this.program.account.tournament.fetch(tournamentPda);
    return {
      id: tournament.id,
      organizer: tournament.organizer,
      sponsor: tournament.sponsor,
      sponsorPool: tournament.sponsorPool,
      organizerRoyalty: tournament.organizerRoyalty,
      expirationTime: tournament.expirationTime,
      entryFee: tournament.entryFee,
      status: tournament.status,
      teamSize: tournament.teamSize,
      minTeams: tournament.minTeams,
      maxTeams: tournament.maxTeams,
      teamCount: tournament.teamCount,
      assetMint: tournament.assetMint,
      tournamentPda: tournamentPda
    };
  }

  async getTeam(
    tournamentNonce: number,
    captain: PublicKey
  ) {
    const nonceBuffer = new Uint8Array(new Uint32Array([tournamentNonce]).buffer);
    let teamPda = getTeamPda([nonceBuffer, captain.toBuffer()]);
    const team = await this.program.account.team.fetch(teamPda);
    return {
      captain: team.captain,
      participants: team.participants,
      teamSize: team.teamSize,
    };
  }
}
