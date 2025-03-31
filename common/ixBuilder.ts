import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";

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
}
