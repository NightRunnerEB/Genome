import { PublicKey } from "@solana/web3.js";

import { airdropAll } from "../../common/utils";

async function main(): Promise<void> {
  const [
    adminAddress,
    deployerAddress,
    verifier1Address,
    verifier2Address,
    operatorAddress,
    organizerAddress,
  ] = process.argv.slice(2);

  const operator = new PublicKey(operatorAddress);
  const admin = new PublicKey(adminAddress);
  const deployer = new PublicKey(deployerAddress);
  const organizer = new PublicKey(organizerAddress);
  const verifier1 = new PublicKey(verifier1Address);
  const verifier2 = new PublicKey(verifier2Address);

  const recipients = [operator, admin, deployer, organizer, verifier1, verifier2];

  await airdropAll(recipients, 10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
