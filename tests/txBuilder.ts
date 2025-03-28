import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { getConfigPda, getUserRolePda } from "./utils";

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
        deployer: deployer.publicKey,
      })
      .signers([deployer])
      .rpc();
  }

  async grantRole(
    admin: Keypair,
    user: PublicKey,
    params: any
  ): Promise<string> {
    return this.program.methods
      .grantRole(params)
      .accounts({
        admin: admin.publicKey,
        user
      })
      .signers([admin])
      .rpc();
  }

  async revokeRole(
    admin: Keypair,
    user: PublicKey,
  ): Promise<string> {
    return this.program.methods
      .revokeRole()
      .accounts({
        admin: admin.publicKey,
        user
      })
      .signers([admin])
      .rpc();
  }

  async getConfig() {
    let configPda = getConfigPda();
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
