import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccount, 
  mintTo, 
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { getProvider } from "../../common/utils";

async function main(): Promise<void> {
  const [payerPath, tokenOwnerPath, tokenMintAddress, ...recipientAddresses] = process.argv.slice(2);

  const payer = await getKeypairFromFile(payerPath);
  const tokenOwner = await getKeypairFromFile(tokenOwnerPath);
  const tokenMint = new PublicKey(tokenMintAddress);
  const recipients = recipientAddresses.map(addr => new PublicKey(addr));

  const amount = 1e10;

  for (const recipient of recipients) {
    const ata = await createAssociatedTokenAccount(
      getProvider().connection,
      payer,
      tokenMint,
      recipient,
      undefined,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const txSignature = await mintTo(
      getProvider().connection,
      payer,
      tokenMint,
      ata,
      tokenOwner,
      amount,
      [],
      {},
      TOKEN_PROGRAM_ID
    );
    console.log(`Minted ${amount} tokens to ${recipient.toBase58()} | tx: ${txSignature}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
