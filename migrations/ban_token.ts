import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { GenomeContract } from "../target/types/genome_contract";

async function main() {
  const operatorKeypairPath = process.argv[2];
  const assetMintAddress = process.argv[3];

  const operator = await getKeypairFromFile(operatorKeypairPath);
  const assetMint = new anchor.web3.PublicKey(assetMintAddress);

  console.log(`operator: ${operator.publicKey.toBase58()}`);
  console.log(`assetMint: ${assetMint}`);

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;

  const tx = await program.methods
    .banToken()
    .accounts({
      operator: operator.publicKey,
      assetMint: assetMint,
    })
    .signers([operator])
    .rpc();

  console.log("Ban token tx signature:", tx);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
