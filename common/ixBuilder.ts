import { Program } from "@coral-xyz/anchor";
import {
    PublicKey,
    TransactionInstruction,
    SystemProgram,
} from "@solana/web3.js";

import { GenomeContract } from "../target/types/genome_contract";
import { getConstant, getGenomePda, getProgram } from "./utils";

const PROGRAM = getProgram();

export class IxBuilder {
    public program: Program<GenomeContract>;
    private configPda: PublicKey;
    private roleSeed: Uint8Array;

    constructor() {
        this.program = PROGRAM;
        this.configPda = getGenomePda([getConstant("config")]);
        this.roleSeed = getConstant("role");
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
                tokenInfo: getGenomePda([getConstant("token"), assetMint.toBuffer()]),
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
                tokenInfo: getGenomePda([getConstant("token"), assetMint.toBuffer()]),
            })
            .instruction();
    }

    async revokeRoleIx(
        admin: PublicKey,
        user: PublicKey
    ): Promise<TransactionInstruction> {
        return this.program.methods
            .revokeRole()
            .accountsStrict({
                admin,
                user,
                roleInfo: getGenomePda([this.roleSeed, user.toBuffer()]),
                config: this.configPda,
            })
            .instruction();
    }
}
