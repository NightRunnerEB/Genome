import { PublicKey } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";

import { IxBuilder } from "../common/ixBuilder";
import { buildAndSendTx } from "../common/utils";

async function main() {
    const operatorKeypairPath = process.argv[2];
    const assetMintAddress = process.argv[3];

    const operator = await getKeypairFromFile(operatorKeypairPath);
    const assetMint = new PublicKey(assetMintAddress);

    console.log(`operator: ${operator.publicKey.toBase58()}`);
    console.log(`assetMint: ${assetMint.toBase58()}`);

    const ixBuilder = new IxBuilder();
    const banTokenIx = await ixBuilder.banTokenIx(operator.publicKey, assetMint);
    const txSignature = await buildAndSendTx([banTokenIx], [operator]);
    console.log("Ban token tx signature:", txSignature);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
