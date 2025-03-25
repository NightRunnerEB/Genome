import * as splToken from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";

async function main(): Promise<void> {

  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;

  const [
    payerPath,
    mintPath,
    authorityPath,
    sponsorPath,
    captainPath,
    participant1Path,
    participant2Path,
    participant3Path,
    adminPath,
    organizerPath
  ] = process.argv.slice(2);

  const payer = await getKeypairFromFile(payerPath);
  const mintKeypair = await getKeypairFromFile(mintPath);
  const mintAuthority = await getKeypairFromFile(authorityPath);
  const sponsor = await getKeypairFromFile(sponsorPath);
  const captain = await getKeypairFromFile(captainPath);
  const admin = await getKeypairFromFile(adminPath);
  const organizer = await getKeypairFromFile(organizerPath);
  const participant1 = await getKeypairFromFile(participant1Path);
  const participant2 = await getKeypairFromFile(participant2Path);
  const participant3 = await getKeypairFromFile(participant3Path);

  const mint = mintKeypair.publicKey;
  const recipients = [sponsor, captain, participant1, participant2, participant3];

  const sponsorAta = await splToken.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    sponsor.publicKey,
    true,
    "processed",
    undefined,
    splToken.TOKEN_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  await splToken.approveChecked(
    provider.connection,
    payer,
    mint,
    sponsorAta.address,
    organizer.publicKey,
    sponsor,
    1e8,
    9,
    [],
    {},
    splToken.TOKEN_PROGRAM_ID
  );

  for (const recipient of recipients) {
    const ata = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient.publicKey,
      true,
      "processed",
      undefined,
      splToken.TOKEN_PROGRAM_ID,
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sig = await splToken.mintTo(
      connection,
      payer,
      mint,
      ata.address,
      mintAuthority,
      1_000_000_000,
      [],
      {},
      splToken.TOKEN_PROGRAM_ID
    );
    console.log(`Minted to ${recipient.publicKey.toBase58()} | tx: ${sig}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
