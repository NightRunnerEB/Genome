import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { buildAndSendTx, getTeam, prettify } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [participantPath, tournamentIdStr, captainAddress, ...teammatesAddresses] = args;
  const participant = await getKeypairFromFile(participantPath);
  const tournamentId = parseInt(tournamentIdStr);
  const captain = new PublicKey(captainAddress);
  const teammates = teammatesAddresses.map(addr => new PublicKey(addr));

  const registerParams = {
    tournamentId,
    participant: participant.publicKey,
    captain,
    teammates,
  };

  const ixBuilder = new IxBuilder();
  const registerTournamentIx = await ixBuilder.registerTournamentIx(registerParams);

  const txSignature = await buildAndSendTx([registerTournamentIx], [participant]);
  console.log("Register tournament tx signature:", txSignature);

  const team = await getTeam(tournamentId, captain);
  console.log(`Team: ${prettify(team)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
