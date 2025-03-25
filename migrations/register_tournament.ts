import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { GenomeContract } from "../target/types/genome_contract";
import { prettify } from "./utils";

async function main() {
    const args = process.argv.slice(2);
    const [participantPath, mintAddress, tournamentId, captainAddress, ...teammatesAddress] = args;

    const participant = await getKeypairFromFile(participantPath);
    const mint = new anchor.web3.PublicKey(mintAddress);
    const captain = new anchor.web3.PublicKey(captainAddress);
    const teammates = teammatesAddress.map(t => new anchor.web3.PublicKey(t));

    const registerData = {
        tournamentId: parseInt(tournamentId),
        participant: participant.publicKey,
        captain: captain,
        teammates,
    };

    console.log(`registerData = ${prettify(registerData)}`);

    console.log("Mint: " + mint);

    await registerTournament(participant, mint, registerData);
}

async function registerTournament(
    participant: anchor.web3.Keypair,
    mint: anchor.web3.PublicKey,
    registerData: any
) {
    const program = anchor.workspace
        .GenomeContract as anchor.Program<GenomeContract>;

    const tx = await program.methods
        .registerTournament(registerData)
        .accounts({
            participant: participant.publicKey,
            mint,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([participant])
        .transaction();

    let provider = anchor.AnchorProvider.env();
    let txSignature = await provider.sendAndConfirm(tx, [participant]);
    console.log(`Register tournament tx: ${txSignature}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
