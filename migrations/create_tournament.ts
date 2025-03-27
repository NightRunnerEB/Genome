import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { GenomeContract } from "../target/types/genome_contract";
import { prettify } from "./utils";
import { getGenomePda, getTournamentPda } from "../tests/utils";

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
    maxTeamsStr
  ] = args;

  const organizer = await getKeypairFromFile(organizerPath);
  const mint = new anchor.web3.PublicKey(mintAddress);
  const sponsor = new anchor.web3.PublicKey(sponsorAddress);

  const tournamentData = {
    organizer: organizer.publicKey,
    asset_mint: mintAddress,
    organizer_fee: new anchor.BN(organizerFeeStr),
    sponsor_pool: new anchor.BN(sponsorPoolStr),
    entry_fee: new anchor.BN(entryFeeStr),
    team_size: parseInt(teamSizeStr),
    min_teams: parseInt(minTeamsStr),
    max_teams: parseInt(maxTeamsStr)
  };

  console.log(`Tournament data: ${prettify(tournamentData)}`);

  await createTournament(organizer, sponsor, mint, tournamentData);
}

async function createTournament(
  organizer: anchor.web3.Keypair,
  sponsor: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  tournamentData: any
) {
  const program = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;

  const tx = await program.methods
    .createTournament(tournamentData)
    .accounts({
      organizer: organizer.publicKey,
      sponsor,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([organizer])
    .transaction();

  const provider = anchor.AnchorProvider.env();
  const txSignature = await provider.sendAndConfirm(tx, [organizer]);
  console.log(`Create tournament tx: ${txSignature}`);

  const configPda = getGenomePda();
  const config = await program.account.genomeConfig.fetch(
    configPda
  );
  const tournamentPda = getTournamentPda(new Uint8Array(
    new Uint32Array([config.tournamentNonce - 1]).buffer
  ));
  const tournament = await program.account.tournament.fetch(
    tournamentPda
  );
  console.log(`Tournament: ${prettify(tournament)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
