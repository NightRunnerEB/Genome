import * as anchor from "@coral-xyz/anchor";
import { airdrop } from "../tests/utils";

async function main(): Promise<void> {
  const [
    deployerAddress,
    verifier1Address,
    verifier2Address,
    verifier3Address,
    operatorAddress,
    adminAddress,
    organizerAddress
  ] = process.argv.slice(2);

  const operator = new anchor.web3.PublicKey(operatorAddress);
  const admin = new anchor.web3.PublicKey(adminAddress);
  const deployer = new anchor.web3.PublicKey(deployerAddress);
  const organizer = new anchor.web3.PublicKey(organizerAddress);
  const verifier1 = new anchor.web3.PublicKey(verifier1Address);
  const verifier2 = new anchor.web3.PublicKey(verifier2Address);
  const verifier3 = new anchor.web3.PublicKey(verifier3Address);

  const recipients = [operator, admin, deployer, organizer, verifier1, verifier2, verifier3];

  await Promise.all(
    recipients.map(
      async (keypair) => await airdrop(keypair, 10)
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
