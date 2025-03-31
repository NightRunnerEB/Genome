import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, checkAnchorError } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, getProvider, getUserRole } from "../common/utils";

describe("Genome Solana Singlechain", () => {
  const provider = getProvider();
  const ixBuilder = new IxBuilder();

  const { admin, deployer, platform, organizer, nome, verifier1, verifier2, operator } = getKeyPairs();

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

  it("Grant role", async () => {
    const roles: [anchor.web3.PublicKey, { operator?: {}; verifier?: {} }][] = [
      [operator.publicKey, { operator: {} }],
      [organizer.publicKey, { verifier: {} }],
      [verifier2.publicKey, { verifier: {} }],
    ];

    for (const [userPubkey, roleParams] of roles) {
      const grantIx = await ixBuilder.grantRoleIx(admin.publicKey, userPubkey, roleParams);
      const tx = new Transaction().add(grantIx);
      const txSig = await provider.sendAndConfirm(tx, [admin]);
      console.log("Grant role tx signature:", txSig);

      const userRole = await getUserRole(userPubkey);
      assert.deepEqual(userRole.role, roleParams);
    }
    const config = await getConfig();
    assert.ok(config.verifierAddresses.map(pk => pk.toString()).includes(verifier2.publicKey.toString()));
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
    for (const role of [operator.publicKey, verifier2.publicKey, organizer.publicKey]) {
      const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, role);
      const tx = new Transaction().add(revokeIx);
      const txSig = await provider.sendAndConfirm(tx, [admin]);
      console.log("Revoke role tx:", txSig);
      try {
        await getUserRole(role);
      } catch (error) {
        checkAnchorError(error, "Account does not exist");
      }
    }
    const config = await getConfig();
    assert.ok(config.verifierAddresses.map(pk => pk.toString()).includes(verifier1.publicKey.toString()));
    assert.ok(!config.verifierAddresses.map(pk => pk.toString()).includes(verifier2.publicKey.toString()));
  });
});
