import * as anchor from "@coral-xyz/anchor";
import { getKeypairFromFile } from "@solana-developers/node-helpers";
import { Transaction } from "@solana/web3.js";

import { IxBuilder } from "../common/ixBuilder";

async function main() {
    const operatorKeypairPath = process.argv[2];
    const assetMintAddress = process.argv[3];

    const operator = await getKeypairFromFile(operatorKeypairPath);
    const assetMint = new anchor.web3.PublicKey(assetMintAddress);

    console.log(`operator: ${operator.publicKey.toBase58()}`);
    console.log(`assetMint: ${assetMint.toBase58()}`);

    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.AnchorProvider.env();

    const ixBuilder = new IxBuilder();
    const banTokenIx = await ixBuilder.banTokenIx(operator.publicKey, assetMint);
    const tx = new Transaction().add(banTokenIx);
    const txSignature = await provider.sendAndConfirm(tx, [operator]);
    console.log("Ban token tx signature:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
