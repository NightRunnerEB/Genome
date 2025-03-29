import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { getGenomePda, getTokenInfoPda, getTournamentPda, getUserRolePda } from "./utils";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class TxBuilder {
  public program: anchor.Program<GenomeContract>;

  constructor() {
    this.program = anchor.workspace
      .GenomeContract as anchor.Program<GenomeContract>;
  }

  async initialize(deployer: Keypair, configData: any): Promise<string> {
    return this.program.methods
      .initialize(configData)
      .accounts({
        admin: deployer.publicKey,
      })
      .signers([deployer])
      .rpc();
  }

  async createTournament(
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

  async grantRole(
    admin: Keypair,
    user: Keypair,
    params: any
  ): Promise<string> {
    return this.program.methods
      .grantRole(params)
      .accounts({
        admin: admin.publicKey,
        user: user.publicKey
      })
      .signers([admin])
      .rpc();
  }

  async revokeRole(
    admin: Keypair,
    user: Keypair,
  ): Promise<string> {
    return this.program.methods
      .revokeRole()
      .accounts({
        admin: admin.publicKey,
        user: user.publicKey
      })
      .signers([admin])
      .rpc();
  }

  async approveToken(
    operator: Keypair,
    token: Keypair,
    minSponsorPool: any,
    minEntryFee: any
  ): Promise<string> {
    return this.program.methods
      .approveToken(minSponsorPool, minEntryFee)
      .accounts({
        operator: operator.publicKey,
        assetMint: token.publicKey
      })
      .signers([operator])
      .rpc();
  }

  async banToken(
    operator: Keypair,
    token: Keypair,
    isBanned: boolean
  ): Promise<string> {
    return this.program.methods
      .banToken()
      .accounts({
        operator: operator.publicKey,
        assetMint: token.publicKey
      })
      .signers([operator])
      .rpc();
  }

  async getConfig() {
    let configPda = getGenomePda();
    const config = await this.program.account.genomeConfig.fetch(configPda);
    return {
      admin: config.admin,
      verifierAddresses: config.verifierAddresses,
      consensusRate: config.consensusRate,
      tournamentNonce: config.tournamentNonce,
      platformFee: config.platformFee,
      platformWallet: config.platformWallet,
      falsePrecision: config.falsePrecision,
      minTeams: config.minTeams,
      maxTeams: config.maxTeams,
      maxOrganizerFee: config.maxOrganizerFee,
      nomeMint: config.nomeMint,
    };
  }

  async getTournament(tournamentNonce: number) {
    const nonceBuffer = new Uint8Array(
      new Uint32Array([tournamentNonce]).buffer
    );
    let tournamentPda = getTournamentPda(nonceBuffer);
    const tournament = await this.program.account.tournament.fetch(
      tournamentPda
    );
    return {
      id: tournament.id,
      organizer: tournament.organizer,
      sponsorPool: tournament.sponsorPool,
      organizerFee: tournament.organizerFee,
      entryFee: tournament.entryFee,
      status: tournament.status,
      teamSize: tournament.teamSize,
      minTeams: tournament.minTeams,
      maxTeams: tournament.maxTeams,
      teamCount: tournament.teamCount,
      assetMint: tournament.assetMint,
      tournamentPda: tournamentPda,
    };
  }

  async getTokenInfo(token: PublicKey) {
    let tokenInfoPda = getTokenInfoPda(token.toBuffer());
    const tokenInfo = await this.program.account.tokenInfo.fetch(
      tokenInfoPda
    );
    return {
      assetMint: tokenInfo.assetMint,
      minSponsorPool: tokenInfo.minSponsorPool,
      minEntryPool: tokenInfo.minEntryFee,
    }
  }

  async getUserRole(user: PublicKey) {
    let userRolePda = getUserRolePda(user.toBuffer());
    const userRole = await this.program.account.roleInfo.fetch(
      userRolePda
    );
    return {
      role: userRole.role
    }
  }
}
