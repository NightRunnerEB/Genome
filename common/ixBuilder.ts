import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";

import { getConstant, getPda, getProgram } from "./utils";

const PROGRAM = getProgram();

export class IxBuilder {
    public program: anchor.Program<GenomeContract>;
    private config: Uint8Array;
    private role: Uint8Array;

    constructor() {
        this.program = PROGRAM;
        this.config = getConstant("config");
        this.role = getConstant("role");
    }

    async initializeIx(deployer: PublicKey, configData: any): Promise<TransactionInstruction> {
        return this.program.methods
            .initialize(configData)
            .accountsStrict({
                deployer,
                config: getPda([this.config]),
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .instruction();
    }

    async grantRoleIx(admin: PublicKey, user: PublicKey, params: any): Promise<TransactionInstruction> {
        return this.program.methods
            .grantRole(params)
            .accountsStrict({
                admin,
                user,
                roleInfo: getPda([this.role, user.toBuffer()]),
                config: getPda([this.config]),
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .instruction();
    }

    async revokeRoleIx(admin: PublicKey, user: PublicKey): Promise<TransactionInstruction> {
        return this.program.methods
            .revokeRole()
            .accountsStrict({
                admin,
                user,
                roleInfo: getPda([this.role, user.toBuffer()]),
                config: getPda([this.config]),
            })
            .instruction();
    }
}
