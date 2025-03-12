import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import {
    getGenomePda,
    getTournamentPda,
} from "./utils";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";

export class TxBuilder {
    public program: anchor.Program<GenomeContract>;

    constructor() {
        this.program = anchor.workspace
            .GenomeContract as anchor.Program<GenomeContract>;
    }

    async initialize(
        admin: Keypair,
        configData: any,
    ): Promise<string> {
        return this.program.methods
            .initialize(configData)
            .accounts({
                admin: admin.publicKey,
                systemProgram: SYSTEM_PROGRAM_ID,
            })
            .signers([admin])
            .rpc();
    }

    async createTournamentSinglechain(
        organizer: Keypair,
        sponsor: Keypair,
        mint: PublicKey,
        params: any,
    ): Promise<string> {
        return this.program.methods
            .createTournament(params)
            .accounts({
                organizer: organizer.publicKey,
                sponsor: sponsor.publicKey,
                mint: mint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .signers([organizer])
            .rpc();
    }

    async createInvalidTournament(
        organizer: Keypair,
        sponsor: Keypair,
        mint: PublicKey,
        params: any,
        expectedRegex: RegExp
    ): Promise<void> {
        try {
            await this.createTournamentSinglechain(organizer, sponsor, mint, params);
            throw new Error("An error was expected, but the transaction was successful");
        } catch (err: any) {
            assert.match(err.toString(), expectedRegex);
        }
    }

    async getConfig() {
        let configPda = getGenomePda();
        const config = await this.program.account.genomeConfig.fetch(configPda);
        return {
            admin: config.admin,
            tournamentNonce: config.tournamentNonce,
            platformFee: config.platformFee,
            platformWallet: config.platformWallet,
            minEntryFee: config.minEntryFee,
            minSponsorPool: config.minSponsorPool,
            minTeams: config.minTeams,
            maxTeams: config.maxTeams,
            maxOrganizerRoyalty: config.maxOrganizerRoyalty,
            mint: config.mint,
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
            entryFee: tournament.entryFee,
            status: tournament.status,
            teamSize: tournament.teamSize,
            minTeams: tournament.minTeams,
            maxTeams: tournament.maxTeams,
            teamCount: tournament.teamCount,
            token: tournament.token,
        };
    }
}
