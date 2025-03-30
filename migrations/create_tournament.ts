import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { getConfig, getTournament, prettify } from "../common/utils";
import { IxBuilder } from "../common/ixBuilder";
import { getProvider } from "../common/utils";

async function main() {
    const args = process.argv.slice(2);
    const [
        organizerPath,
        sponsorAddress,
        mintAddress,
        organizerFeeStr,
        sponsorPoolStr,
        entryFeeStr,
        teamSizeStr,
        minTeamsStr,
        maxTeamsStr,
    ] = args;

    const organizer = await getKeypairFromFile(organizerPath);
    const mint = new anchor.web3.PublicKey(mintAddress);
    const sponsor = new anchor.web3.PublicKey(sponsorAddress);

    await createTournament(
        organizer,
        sponsor,
        mint,
        {
            organizer: organizer.publicKey,
            asset_mint: mintAddress,
            organizer_fee: new anchor.BN(organizerFeeStr),
            sponsor_pool: new anchor.BN(sponsorPoolStr),
            entry_fee: new anchor.BN(entryFeeStr),
            team_size: parseInt(teamSizeStr),
            min_teams: parseInt(minTeamsStr),
            max_teams: parseInt(maxTeamsStr),
        }
    );
}

async function createTournament(
    organizer: anchor.web3.Keypair,
    sponsor: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    tournamentData: any
) {
    const provider = getProvider();
    const ixBuilder = new IxBuilder();
    const createTournamentIx = await ixBuilder.createTournamentIx(
        organizer.publicKey,
        sponsor,
        mint,
        tournamentData
    );
    const tx = new Transaction().add(createTournamentIx);
    const txSignature = await provider.sendAndConfirm(tx, [organizer]);
    console.log(`Create tournament tx: ${txSignature}`);

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
