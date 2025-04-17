import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx, getTournament } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [verifierKeypairPath, tournamentIdStr] = args;
  const verifier = await getKeypairFromFile(verifierKeypairPath);
  const tournamentId = parseInt(tournamentIdStr);

  const ixBuilder = new IxBuilder();
  const cancelTournamentIx = await ixBuilder.cancelTournamentIx(verifier.publicKey, tournamentId);

  const txSignature = await buildAndSendTx([cancelTournamentIx], [verifier]);
  console.log("Cancel tournament tx signature:", txSignature);

  const tournament = await getTournament(tournamentId);
  console.log("Tournament status: ", tournament.status)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
