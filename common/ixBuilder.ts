import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { getProgram } from "./utils";

const PROGRAM = getProgram();

export class IxBuilder {
    public program: anchor.Program<GenomeContract>;

    constructor() {
        this.program = PROGRAM;
    }

    async initializeIx(deployer: PublicKey, configData: any): Promise<TransactionInstruction> {
        return this.program.methods
            .initialize(configData)
            .accounts({ deployer })
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

    async grantRoleIx(admin: PublicKey, user: PublicKey, params: any): Promise<TransactionInstruction> {
        return this.program.methods
            .grantRole(params)
            .accounts({ admin, user })
            .instruction();
    }

    async revokeRoleIx(admin: PublicKey, user: PublicKey): Promise<TransactionInstruction> {
        return this.program.methods
            .revokeRole()
            .accounts({ admin, user })
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
            .accounts({ operator, assetMint })
            .instruction();
    }

    async banTokenIx(
        operator: PublicKey,
        assetMint: PublicKey,
    ): Promise<TransactionInstruction> {
        return this.program.methods
            .banToken()
            .accounts({ operator, assetMint })
            .instruction();
    }
}
