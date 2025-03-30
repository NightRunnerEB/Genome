import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { Transaction } from "@solana/web3.js";
import { IxBuilder } from "../common/ixBuilder";
import { getProvider } from "../common/utils";

async function main() {
    const operatorKeypairPath = process.argv[2];
    const assetMintAddress = process.argv[3];
    const minSponsorPool = new anchor.BN(process.argv[4]);
    const minEntryFee = new anchor.BN(process.argv[5]);

    const operator = await getKeypairFromFile(operatorKeypairPath);
    const assetMint = new anchor.web3.PublicKey(assetMintAddress);

    console.log(`operator: ${operator.publicKey.toBase58()}`);
    console.log(`assetMint: ${assetMint.toBase58()}`);

    const provider = getProvider();
    const ixBuilder = new IxBuilder();
    const approveTokenIx = await ixBuilder.approveTokenIx(
        operator.publicKey,
        assetMint,
        minSponsorPool,
        minEntryFee
    );

    const tx = new Transaction().add(approveTokenIx);
    const txSignature = await provider.sendAndConfirm(tx, [operator]);
    console.log("Approve token tx signature:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
