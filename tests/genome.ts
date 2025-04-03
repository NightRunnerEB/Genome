import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, getUserRole, checkAnchorError, sleep, createGenomeMint } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, buildAndSendTx, getTokenInfo, Role, getProvider } from "../common/utils";

describe("Genome Solana Singlechain", () => {
  const ixBuilder = new IxBuilder();

  const { admin, deployer, platform, token, organizer, nome, verifier1, verifier2, operator } = getKeyPairs();

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

    await createGenomeMint();
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
    const grantRoleIx = await ixBuilder.grantRoleIx(
      operator.publicKey,
      organizer.publicKey,
      { organizer: {} }
    );
    try {
      await buildAndSendTx([grantRoleIx], [operator]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Not Allowed");
    }
  });

  it("Grant role", async () => {
    const beforeInfo = await getProvider().connection.getAccountInfo(ixBuilder.configPda);
    const beforeLamports = beforeInfo?.lamports ?? 0;

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
      assert.deepEqual(userRole[0], roleParams);
    }

    const afterInfo = await getProvider().connection.getAccountInfo(ixBuilder.configPda);
    const afterLamports = afterInfo?.lamports ?? 0;
    assert.notEqual(beforeLamports - afterLamports, 0)
    console.log("Config lamports before grant:", beforeLamports);
    console.log("Config lamports after grant:", afterLamports);

    const config = await getConfig();
    assert.deepEqual(config.verifierAddresses, [verifier2.publicKey]);
  });

  it("Give the role to the same person again", async () => {
    await sleep(3000);
    const grantIx = await ixBuilder.grantRoleIx(
      admin.publicKey,
      verifier2.publicKey,
      { verifier: {} }
    );
    try {
      await buildAndSendTx([grantIx], [admin]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Role already granted.");
    }
  });

  it("Approve Token", async () => {
    const minSponsorPool = new BN(1000);
    const minEntryPool = new BN(100);
    let approveTokenIx = await ixBuilder.approveTokenIx(operator.publicKey, token.publicKey, minSponsorPool, minEntryPool);
    const txSig = await buildAndSendTx([approveTokenIx], [operator]);
    console.log("Approve Token tx: ", txSig);

    const tokenInfo = await getTokenInfo(token.publicKey);
    assert.deepEqual(tokenInfo.assetMint, token.publicKey);
    assert.equal(tokenInfo.minEntryFee.toNumber(), minEntryPool.toNumber());
    assert.equal(tokenInfo.minSponsorPool.toNumber(), minSponsorPool.toNumber());
  });

  it("Ban Token", async () => {
    const banTokenIx = await ixBuilder.banTokenIx(operator.publicKey, token.publicKey);
    const txSig = await buildAndSendTx([banTokenIx], [operator]);
    console.log("Ban Token tx: ", txSig);
    try {
      await getTokenInfo(token.publicKey);
    } catch (error) {
      checkAnchorError(error, "Account does not exist");
    }
  });

  it("Revoke Role", async () => {
    const beforeInfo = await getProvider().connection.getAccountInfo(ixBuilder.configPda);
    const beforeLamports = beforeInfo?.lamports ?? 0;

    const roles: [PublicKey, Role][] = [
      [operator.publicKey, { operator: {} }],
      [organizer.publicKey, { organizer: {} }],
      [verifier2.publicKey, { verifier: {} }],
    ];

    for (const [userPubkey, roleParams] of roles) {
      const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, userPubkey, roleParams);
      const txSig = await buildAndSendTx([revokeIx], [admin]);
      console.log("Revoke role tx:", txSig);
      const userRole = await getUserRole(userPubkey);
      assert.ok(!userRole.some((r) => JSON.stringify(r) === JSON.stringify(roleParams)));
    }
    const afterInfo = await getProvider().connection.getAccountInfo(ixBuilder.configPda);
    const afterLamports = afterInfo?.lamports ?? 0;
    assert.notEqual(beforeLamports - afterLamports, 0)
    console.log("Config lamports before revoke:", beforeLamports);
    console.log("Config lamports after revoke:", afterLamports);

    const config = await getConfig();
    assert.deepEqual(config.verifierAddresses, []);
  });

  it("Revoke Role of a non-existent person", async () => {
    const revokeIx = await ixBuilder.revokeRoleIx(admin.publicKey, operator.publicKey, { operator: {} });
    try {
      await buildAndSendTx([revokeIx], [admin]);
      throw new Error("Expected error was not thrown");
    } catch (error) {
      checkAnchorError(error, "Role not found");
    }
  });
});
