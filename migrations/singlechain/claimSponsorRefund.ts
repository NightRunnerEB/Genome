import { getKeypairFromFile } from "@solana-developers/helpers";

import { buildAndSendTx } from "../../common/utils";
import { IxBuilder } from "../../common/ixBuilder";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [sponsorKeypairPath, tournamentIdStr] = args;
  const sponsor = await getKeypairFromFile(sponsorKeypairPath);
  const tournamentId = parseInt(tournamentIdStr);

  const ixBuilder = new IxBuilder();
  const claimSponsorRefundIx = await ixBuilder.claimSponsorRefundIx(
    sponsor.publicKey,
    tournamentId
  );

  const txSignature = await buildAndSendTx([claimSponsorRefundIx], [sponsor]);
  console.log("Claim sponsor refund tx signature:", txSignature);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
