import { BN, IdlTypes } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, getUserRole, checkAnchorError } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, buildAndSendTx, prettify } from "../common/utils";
import { GenomeContract } from "../target/types/genome_contract";

describe("Genome Solana Singlechain", () => {
  const ixBuilder = new IxBuilder();
  const {
    admin,
    deployer,
    platform,
    organizer,
    nome,
    verifier1,
    verifier2,
    operator,
  } = getKeyPairs();

  const configData = {
    admin: admin.publicKey,
    tournamentNonce: 0,
    platformFee: new BN(10),
    platformWallet: platform.publicKey,
    nomeMint: nome.publicKey,
    minTeams: 2,
    maxTeams: 20,
    falsePrecision: 0.000065,
    maxOrganizerFee: new BN(5000),
    consensusRate: 66.0,
    verifierAddresses: [],
  };

  before(async () => {
    await airdropAll(
      [
        admin.publicKey,
        deployer.publicKey,
        organizer.publicKey,
        operator.publicKey,
        verifier1.publicKey,
        verifier2.publicKey,
      ],
      10
    );
  });

  it("Initialize Genome Solana with Invalid Params", async () => {
    try {
      const configDataInvalid = {
        ...configData,
        verifierAddresses: [...configData.verifierAddresses, verifier1.publicKey, verifier2.publicKey]
      };
      const initIx = await ixBuilder.initializeIx(deployer.publicKey, configDataInvalid);
      await buildAndSendTx([initIx], [deployer]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Invalid Params");
    }
  });

  it("Initialize Genome Solana", async () => {
    const initIx = await ixBuilder.initializeIx(deployer.publicKey, configData);
    const initTxSig = await buildAndSendTx([initIx], [deployer]);
    console.log("Initialize Genome tx:", initTxSig);

    const config = await getConfig();
    assert.deepEqual(config.admin, configData.admin);
    assert.deepEqual(config.platformWallet, configData.platformWallet);
    assert.equal(config.falsePrecision, configData.falsePrecision);
    assert.equal(
      config.platformFee.toNumber(),
      configData.platformFee.toNumber()
    );
    assert.equal(
      config.maxOrganizerFee.toNumber(),
      configData.maxOrganizerFee.toNumber()
    );
    assert.equal(config.tournamentNonce, configData.tournamentNonce);
    assert.equal(config.minTeams, configData.minTeams);
    assert.equal(config.maxTeams, configData.maxTeams);
    assert.deepEqual(config.nomeMint, configData.nomeMint);
    assert.equal(config.consensusRate, configData.consensusRate);
    assert.deepEqual(config.verifierAddresses, configData.verifierAddresses);
  });

  it("Grant Role by non-admin", async () => {
    try {
      const grantRoleIx = await ixBuilder.grantRoleIx(
        operator.publicKey,
        organizer.publicKey,
        { organizer: {} }
      );
      await buildAndSendTx([grantRoleIx], [operator]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Not Allowed");
    }
  });

  it("Grant role", async () => {
    type Role = IdlTypes<GenomeContract>["role"];
    const roles: [PublicKey, Role][] = [
      [operator.publicKey, { operator: {} }],
      [organizer.publicKey, { organizer: {} }],
      [verifier2.publicKey, { verifier: {} }],
    ];

    for (const [userPubkey, roleParams] of roles) {
      const grantIx = await ixBuilder.grantRoleIx(
        admin.publicKey,
        userPubkey,
        roleParams
      );
      const txSig = await buildAndSendTx([grantIx], [admin]);
      console.log("Grant role tx signature:", txSig);

      const userRole = await getUserRole(userPubkey);
      assert.deepEqual(userRole, roleParams);
    }
    const config = await getConfig();
    assert.deepEqual(config.verifierAddresses, [
      verifier2.publicKey,
    ]);
  });

  it("Give the role to the same person again", async () => {
    try {
      const grantIx = await ixBuilder.grantRoleIx(
        admin.publicKey,
        verifier2.publicKey,
        { verifier: {} }
      );
      await buildAndSendTx([grantIx], [admin]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Unable to obtain a new blockhash");
    }
  });

  it("Revoke Role", async () => {
    for (const role of [
      operator.publicKey,
      verifier2.publicKey,
      organizer.publicKey,
    ]) {
      const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, role);
      const txSig = await buildAndSendTx([revokeIx], [admin]);
      console.log("Revoke role tx:", txSig);
      try {
        await getUserRole(role);
        throw new Error("Expected error was not thrown");
      } catch (error) {
        checkAnchorError(error, "Account does not exist");
      }
    }
    const config = await getConfig();
    assert.deepEqual(config.verifierAddresses, []);
  });

  it("Revoke Role of a non-existent person", async () => {
    try {
      const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, operator.publicKey);
      await buildAndSendTx([revokeIx], [admin]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "The program expected this account to be already initialized");
    }
  });
});
