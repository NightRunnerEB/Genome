import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { buildAndSendTx, getConfig, getTournament, prettify } from "../common/utils";
import { IxBuilder } from "../common/ixBuilder";

async function main() {
    const args = process.argv.slice(2);
    const [
        organizerPath,
        sponsorAddress,
        assetMintAddress,
        organizerFeeStr,
        expirationTimeStr,
        sponsorPoolStr,
        entryFeeStr,
        teamSizeStr,
        minTeamsStr,
        maxTeamsStr,
    ] = args;

    const organizer = await getKeypairFromFile(organizerPath);
    const assetMint = new PublicKey(assetMintAddress);
    const sponsor = new PublicKey(sponsorAddress);

    const ixBuilder = new IxBuilder();
    const createTournamentIx = await ixBuilder.createTournamentIx(
        organizer.publicKey,
        sponsor,
        assetMint,
        {
            organizer: organizer.publicKey,
            assetMint,
            organizerFee: new BN(organizerFeeStr),
            expirationTime: new BN(expirationTimeStr),
            sponsorPool: new BN(sponsorPoolStr),
            entryFee: new BN(entryFeeStr),
            teamSize: parseInt(teamSizeStr),
            minTeams: parseInt(minTeamsStr),
            maxTeams: parseInt(maxTeamsStr),
        }
    );
    
    const txSignature = await buildAndSendTx([createTournamentIx], [organizer]);
    console.log("Create tournament tx signature:", txSignature);

    const config = await getConfig();
    const tournament = await getTournament(config.tournamentNonce - 1);
    console.log(`Tournament: ${prettify(tournament)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
