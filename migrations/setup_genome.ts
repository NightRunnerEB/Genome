import { approveChecked, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { airdrop } from "../tests/utils";

async function main(): Promise<void> {

  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;

  const [
    authorityPath,
    payerPath,
    assentMintAddress,
    nomeMintAddress,
    sponsorAddress,
    captainAddress,
    deployerAddress,
    verifier1Address,
    verifier2Address,
    verifier3Address,
    operatorAddress,
    adminAddress, 
    organizerAddress
  ] = process.argv.slice(2);

  const payer = await getKeypairFromFile(payerPath);
  const mintAuthority = await getKeypairFromFile(authorityPath);
  const assetMint = new anchor.web3.PublicKey(assentMintAddress);
  const nomeMint = new anchor.web3.PublicKey(nomeMintAddress);
  const sponsor = new anchor.web3.PublicKey(sponsorAddress);
  const operator = new anchor.web3.PublicKey(operatorAddress);
  const captain = new anchor.web3.PublicKey(captainAddress);
  const admin =new anchor.web3.PublicKey(adminAddress);
  const deployer = new anchor.web3.PublicKey(deployerAddress);
  const organizer = new anchor.web3.PublicKey(organizerAddress);
  const verifier1 = new anchor.web3.PublicKey(verifier1Address);
  const verifier2 = new anchor.web3.PublicKey(verifier2Address);
  const verifier3 = new anchor.web3.PublicKey(verifier3Address);

  const recipients = [sponsor, captain, operator, admin, deployer, organizer, verifier1, verifier2, verifier3];

  await Promise.all(
    recipients.concat(payer.publicKey).map(
      async (keypair) => await airdrop(keypair, 10)
    )
  );

  await createAtaAndMint(connection, payer, assetMint, mintAuthority, recipients, 1e8);
  await createAtaAndMint(connection, payer, nomeMint, mintAuthority, recipients, 1e8);
  
  const sponsorAta = await createAssociatedTokenAccount(
    connection,
    payer,
    assetMint,
    sponsor,
    {},
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  await approveChecked(
    provider.connection,
    payer,
    assetMint,
    sponsorAta,
    organizer,
    sponsor,
    1e8,
    9,
    [],
    {},
    TOKEN_PROGRAM_ID
  );
}

async function createAtaAndMint(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  assetMint: anchor.web3.PublicKey,
  mintAuthority: anchor.web3.Keypair,
  recipients: anchor.web3.PublicKey[],
  amount: number
) {
  for (const recipient of recipients) {
    const ata = await createAssociatedTokenAccount(
      connection,
      payer,
      assetMint,
      recipient,
      {},
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sig = await mintTo(
      connection,
      payer,
      assetMint,
      ata,
      mintAuthority,
      amount,
      [],
      {},
      TOKEN_PROGRAM_ID
    );
    console.log(`Minted to ${recipient.toBase58()} | tx: ${sig}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
