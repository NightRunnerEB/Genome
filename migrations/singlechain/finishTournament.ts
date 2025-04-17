import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx, getTournament } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const [verifierKeypairPath, tournamentIdStr, winnerAddress] = args;
    const verifier = await getKeypairFromFile(verifierKeypairPath);
    const tournamentId = parseInt(tournamentIdStr);
    const winner = new PublicKey(winnerAddress);

    const ixBuilder = new IxBuilder();
    const finishTournamentIx = await ixBuilder.finishTournamentIx(verifier.publicKey, tournamentId, winner);

    const txSignature = await buildAndSendTx([finishTournamentIx], [verifier]);
    console.log("Finish tournament tx signature:", txSignature);

    const tournament = await getTournament(tournamentId);
    console.log("Tournament status: ", tournament.status)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
