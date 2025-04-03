import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, checkAnchorError, sleep, createGenomeMint, delegateAccount, getUserRole } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, buildAndSendTx, getTokenInfo, Role, getProgram, getProvider, getSponsorAta, getTournament, getPrizePoolAta } from "../common/utils";

describe("Genome Solana Singlechain", () => {
  const ixBuilder = new IxBuilder();

  const { admin, deployer, platform, token, sponsor, organizer, nome, verifier1, verifier2, operator } = getKeyPairs();
  let assetMint: PublicKey;
  let sponsorAta: PublicKey;

  const tournamentDataMock = {
    organizer: organizer.publicKey,
    organizerFee: new BN(100),
    sponsorPool: new BN(1000),
    entryFee: new BN(150),
    teamSize: 10,
    minTeams: 4,
    maxTeams: 10,
    assetMint: token.publicKey,
  };

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

  it("Create mint", async () => {
    ({ assetMint, sponsorAta } = await createGenomeMint());
  });

  it("Delegate", async () => {
    let delegate = await delegateAccount(sponsorAta);
    console.log("Initialize delegate tx: ", delegate);
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
    await sleep(4000);
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

  it("Create a Tournament with banned token", async () => {
    try {
      const ix = await ixBuilder.createTournamentIx(
        organizer.publicKey,
        sponsor.publicKey,
        token.publicKey,
        tournamentDataMock
      );
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "expected this account to be already initialized");
    }
  });

  it("Create a Tournament with approved token", async () => {
    // Approve token first
    const minSponsorPool = new BN(1000);
    const minEntryFee = new BN(100);
    let ix = await ixBuilder.approveTokenIx(operator.publicKey, token.publicKey, minSponsorPool, minEntryFee);
    let txSig = await buildAndSendTx([ix], [operator]);
    console.log("Approve token tx signature:", txSig);

    const sponsorAtaBefore = await getSponsorAta(sponsorAta);
    ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, tournamentDataMock);
    txSig = await buildAndSendTx([ix], [organizer]);
    console.log("Create Tournament tx signature:", txSig);

    const sponsorAtaAfter = await getSponsorAta(sponsorAta);
    const configData = await getConfig();
    const tournamentAccount = await getTournament(configData.tournamentNonce - 1);

    assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
    assert.equal(tournamentAccount.teamCount, 0);
    assert.equal(tournamentAccount.tournamentData.sponsorPool.toNumber(), tournamentDataMock.sponsorPool.toNumber());
    assert.equal(tournamentAccount.tournamentData.organizerFee.toNumber(), tournamentDataMock.organizerFee.toNumber());
    assert.equal(tournamentAccount.tournamentData.entryFee.toNumber(), tournamentDataMock.entryFee.toNumber());
    assert.equal(tournamentAccount.tournamentData.organizer.toBase58(), tournamentDataMock.organizer.toBase58());
    assert.equal(tournamentAccount.tournamentData.assetMint.toBase58(), tournamentDataMock.assetMint.toBase58());
    assert.equal(tournamentAccount.tournamentData.teamSize, tournamentDataMock.teamSize);
    assert.equal(tournamentAccount.tournamentData.minTeams, tournamentDataMock.minTeams);
    assert.equal(tournamentAccount.tournamentData.maxTeams, tournamentDataMock.maxTeams);
    assert.ok(tournamentAccount.status.new);

    const prizePoolAta = await getPrizePoolAta(assetMint, tournamentAccount.tournamentPda);
    assert.equal(sponsorAtaBefore.amount - sponsorAtaAfter.amount, prizePoolAta.amount);
  });

  it("Create a Tournament by a non-organizer", async () => {
    try {
      const ix = await ixBuilder.createTournamentIx(operator.publicKey, sponsor.publicKey, assetMint, tournamentDataMock);
      await buildAndSendTx([ix], [operator]);
    } catch (error) {
      checkAnchorError(error, "Not Allowed");
    }
  });

  it("Invalid organizer fee", async () => {
    try {
      const invalidData = { ...tournamentDataMock, organizerFee: new BN(9999999) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid organizer fee");
    }
  });

  it("Invalid entry fee", async () => {
    try {
      const invalidData = { ...tournamentDataMock, entryFee: new BN(1) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid entry fee");
    }
  });

  it("Invalid team limit (minTeams, maxTeams)", async () => {
    try {
      const invalidData = { ...tournamentDataMock, maxTeams: 100 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid teams count");
    }

    try {
      const invalidData = { ...tournamentDataMock, minTeams: 0 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid teams count");
    }
  });

  it("Invalid prize_pool", async () => {
    try {
      const invalidData = { ...tournamentDataMock, sponsorPool: new BN(10) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid sponsor pool");
    }
  });

  it("Invalid tournament capacity", async () => {
    try {
      const invalidData = { ...tournamentDataMock, maxTeams: 100, teamSize: 40 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      await buildAndSendTx([ix], [organizer]);
    } catch (error) {
      checkAnchorError(error, "Max players exceeded");
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
