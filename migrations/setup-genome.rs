import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import * as splToken from "@solana/spl-token";

async function main() {
  const payerPath = process.argv[2];
  const adminPath = process.argv[3];
  const mintPath = process.argv[4];

  if (!payerPath || !adminPath || !mintPath) {
    console.error("Usage: ts-node setup-genome.ts <payer.json> <admin.json> <mint.json>");
    process.exit(1);
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = await getKeypairFromFile(payerPath);
  const admin = await getKeypairFromFile(adminPath);
  const mintKeypair = await getKeypairFromFile(mintPath);

  console.log("Payer:", payer.publicKey.toBase58());
  console.log("Admin:", admin.publicKey.toBase58());
  console.log("Mint keypair:", mintKeypair.publicKey.toBase58());

  const mint = await splToken.createMint(
    provider.connection,
    payer,
    admin.publicKey,
    null,
    6,
    mintKeypair,
    null,
    splToken.TOKEN_2022_PROGRAM_ID
  );
  console.log("Genome Mint:", mint.toBase58());

  const adminAta = await splToken.createAssociatedTokenAccount(
    provider.connection,
    payer,
    mint,
    admin.publicKey,
    null,
    splToken.TOKEN_2022_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Admin ATA:", adminAta.toBase58());

  const mintTx = await splToken.mintTo(
    provider.connection,
    payer,
    mint,
    adminAta,
    admin,
    1000000000000,
    [],
    {},
    splToken.TOKEN_2022_PROGRAM_ID
  );
  console.log("Mint to admin tx:", mintTx);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
