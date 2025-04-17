import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { buildAndSendTx } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [participantKeypairPath, tournamentIdStr, captainAddress] = args;
  const participant = await getKeypairFromFile(participantKeypairPath);
  const tournamentId = parseInt(tournamentIdStr);
  const captain = new PublicKey(captainAddress);

  const ixBuilder = new IxBuilder();
  const claimRewardIx = await ixBuilder.claimRewardIx(
    participant.publicKey,
    tournamentId,
    captain
  );

  const txSignature = await buildAndSendTx([claimRewardIx], [participant]);
  console.log("Claim reward tx signature:", txSignature);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
