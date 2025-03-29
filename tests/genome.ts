import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, checkAnchorError } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, getUserRole } from "../common/utils";

describe("Genome Solana Singlechain", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();

  const { admin, deployer, platform, organizer, nome, verifier1, verifier2, operator } = getKeyPairs();
  const ixBuilder = new IxBuilder();

  const configData = {
    admin: admin.publicKey,
    tournamentNonce: 0,
    platformFee: new anchor.BN(10),
    platformWallet: platform.publicKey,
    nomeMint: nome.publicKey,
    minTeams: 2,
    maxTeams: 20,
    falsePrecision: 0.000065,
    maxOrganizerFee: new anchor.BN(5000),
    consensusRate: 66.0,
    verifierAddresses: [verifier1.publicKey]
  };

  before(async () => {
    await airdropAll(
      [
        admin.publicKey,
        deployer.publicKey,
        organizer.publicKey,
        operator.publicKey,
        verifier1.publicKey,
        verifier2.publicKey
      ],
      10
    );
  });

  it("Initialize Genome Solana", async () => {
    const initIx = await ixBuilder.initializeIx(deployer.publicKey, configData);
    const tx = new Transaction().add(initIx);
    const initTxSig = await provider.sendAndConfirm(tx, [deployer]);
    console.log("Initialize Genome tx:", initTxSig);

    const config = await getConfig();
    assert.deepEqual(config.admin, configData.admin);
    assert.deepEqual(config.platformWallet, configData.platformWallet);
    assert.equal(config.falsePrecision, configData.falsePrecision);
    assert.equal(config.platformFee.toNumber(), configData.platformFee.toNumber());
    assert.equal(config.maxOrganizerFee.toNumber(), configData.maxOrganizerFee.toNumber());
    assert.equal(config.tournamentNonce, configData.tournamentNonce);
    assert.equal(config.minTeams, configData.minTeams);
    assert.equal(config.maxTeams, configData.maxTeams);
    assert.deepEqual(config.nomeMint, configData.nomeMint);
    assert.equal(config.consensusRate, configData.consensusRate);
    assert.deepEqual(config.verifierAddresses, configData.verifierAddresses);
  });

  it("Grant Operator Role", async () => {
    const grantOpIx = await ixBuilder.grantRoleIx(admin.publicKey, operator.publicKey, { operator: {} });
    const tx = new Transaction().add(grantOpIx);
    const txSig = await provider.sendAndConfirm(tx, [admin]);
    console.log("Grant operator role tx:", txSig);

    const userRole = await getUserRole(operator.publicKey);
    assert.ok(userRole.role.operator);
  });

  it("Add new Verifier", async () => {
    const grantVerIx = await ixBuilder.grantRoleIx(admin.publicKey, verifier2.publicKey, { verifier: {} });
    const tx = new Transaction().add(grantVerIx);
    const txSig = await provider.sendAndConfirm(tx, [admin]);
    console.log("Add new Verifier tx:", txSig);

    const config = await getConfig();
    const userRole = await getUserRole(verifier2.publicKey);
    assert.ok(userRole.role.verifier);
    assert.ok(config.verifierAddresses.map(pk => pk.toString()).includes(verifier2.publicKey.toString()));
  });

  it("Grant Organizer Role", async () => {
    const grantOrgIx = await ixBuilder.grantRoleIx(admin.publicKey, organizer.publicKey, { organizer: {} });
    const tx = new Transaction().add(grantOrgIx);
    const txSig = await provider.sendAndConfirm(tx, [admin]);
    console.log("Grant organizer role tx:", txSig);

    const userRole = await getUserRole(organizer.publicKey);
    assert.ok(userRole.role.organizer);
  });

  it("Grant Role by non-admin", async () => {
    try {
      const grantRoleIx = await ixBuilder.grantRoleIx(operator.publicKey, organizer.publicKey, { organizer: {} });
      const tx = new Transaction().add(grantRoleIx);
      await provider.sendAndConfirm(tx, [operator]);
    } catch (error) {
      checkAnchorError(error, "Not Allowed");
    }
  });

  it("Revoke Role", async () => {
    let revokeOpIx = await ixBuilder.revokeRoleIx(admin.publicKey, operator.publicKey);
    let tx = new Transaction().add(revokeOpIx);
    let txSig = await provider.sendAndConfirm(tx, [admin]);
    console.log("Revoke operator role tx:", txSig);
    try {
      await getUserRole(operator.publicKey);
    } catch (error) {
      checkAnchorError(error, "Account does not exist");
    }

    let revokeVerIx = await ixBuilder.revokeRoleIx(admin.publicKey, verifier2.publicKey);
    tx = new Transaction().add(revokeVerIx);
    txSig = await provider.sendAndConfirm(tx, [admin]);
    console.log("Revoke verifier role tx:", txSig);
    try {
      await getUserRole(verifier2.publicKey);
    } catch (error) {
      checkAnchorError(error, "Account does not exist");
    }
    const config = await getConfig();
    assert.ok(config.verifierAddresses.map(pk => pk.toString()).includes(verifier1.publicKey.toString()));
    assert.ok(!config.verifierAddresses.map(pk => pk.toString()).includes(verifier2.publicKey.toString()));
  });
});
