import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx, getTournament } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [verifierPath, tournamentIdStr] = args;
  const verifier = await getKeypairFromFile(verifierPath);
  const tournamentId = parseInt(tournamentIdStr);

  const ixBuilder = new IxBuilder();
  const startTournamentIx = await ixBuilder.startTournamentIx(verifier.publicKey, tournamentId);
  const txSignature = await buildAndSendTx([startTournamentIx], [verifier]);
  console.log("Start tournament tx signature:", txSignature);

  const tournament = await getTournament(tournamentId);
  console.log("Tournament status: ", tournament.status)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
