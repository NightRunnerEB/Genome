import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as assert from "assert";

import { getKeyPairs, checkAnchorError, delegateAccount, createGenomeMint } from "./utils";
import { IxBuilder } from "../common/ixBuilder";
import { airdropAll, getConfig, getPrizePoolAta, getSponsorAta, getTokenInfo, getTournament, getUserRole } from "../common/utils";

describe("Genome Solana Singlechain", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();

  const { admin, deployer, platform, token, sponsor, organizer, nome, verifier1, verifier2, operator } = getKeyPairs();
  let assetMint: PublicKey;
  let sponsorAta: PublicKey;
  const ixBuilder = new IxBuilder();

  const tournamentDataMock = {
    organizer: organizer.publicKey,
    organizerFee: new anchor.BN(100),
    sponsorPool: new anchor.BN(1000),
    entryFee: new anchor.BN(150),
    teamSize: 10,
    minTeams: 4,
    maxTeams: 10,
    assetMint: token.publicKey,
  };

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

  it("Create mint", async () => {
    ({ assetMint, sponsorAta } = await createGenomeMint());
  });

  it("Delegate", async () => {
    let delegate = await delegateAccount(sponsorAta);
    console.log("Initialize delegate tx: ", delegate);
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

  it("Approve Token", async () => {
    const minSponsorPool = new anchor.BN(1000);
    const minEntryPool = new anchor.BN(100);
    let approveTokenIx = await ixBuilder.approveTokenIx(operator.publicKey, token.publicKey, minSponsorPool, minEntryPool);
    const tx = new Transaction().add(approveTokenIx);
    const txSig = await provider.sendAndConfirm(tx, [operator]);
    console.log("Approve Token tx: ", txSig);

    const tokenInfo = await getTokenInfo(token.publicKey);
    assert.deepEqual(tokenInfo.assetMint, token.publicKey);
    assert.equal(tokenInfo.minEntryPool.toNumber(), minEntryPool.toNumber());
    assert.equal(tokenInfo.minSponsorPool.toNumber(), minSponsorPool.toNumber());
  });

  it("Ban Token", async () => {
    const banTokenIx = await ixBuilder.banTokenIx(operator.publicKey, token.publicKey);
    const tx = new Transaction().add(banTokenIx);
    const txSig = await provider.sendAndConfirm(tx, [operator]);
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
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "expected this account to be already initialized");
    }
  });

  it("Create a Tournament with approved token", async () => {
    // Approve token first
    const minSponsorPool = new anchor.BN(1000);
    const minEntryFee = new anchor.BN(100);
    let ix = await ixBuilder.approveTokenIx(operator.publicKey, token.publicKey, minSponsorPool, minEntryFee);
    let tx = new Transaction().add(ix);
    let txSig = await provider.sendAndConfirm(tx, [operator]);
    console.log("Approve token tx signature:", txSig);

    const sponsorAtaBefore = await getSponsorAta(sponsorAta);
    ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, tournamentDataMock);
    tx = new Transaction().add(ix);
    txSig = await provider.sendAndConfirm(tx, [organizer]);
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
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [operator]);
    } catch (error) {
      checkAnchorError(error, "Not Allowed");
    }
  });

  it("Invalid organizer fee", async () => {
    try {
      const invalidData = { ...tournamentDataMock, organizerFee: new anchor.BN(9999999) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid organizer fee");
    }
  });

  it("Invalid entry fee", async () => {
    try {
      const invalidData = { ...tournamentDataMock, entryFee: new anchor.BN(1) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid entry fee");
    }
  });

  it("Invalid team limit (minTeams, maxTeams)", async () => {
    try {
      const invalidData = { ...tournamentDataMock, maxTeams: 100 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid teams count");
    }

    try {
      const invalidData = { ...tournamentDataMock, minTeams: 0 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid teams count");
    }
  });

  it("Invalid prize_pool", async () => {
    try {
      const invalidData = { ...tournamentDataMock, sponsorPool: new anchor.BN(10) };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Invalid sponsor pool");
    }
  });

  it("Invalid tournament capacity", async () => {
    try {
      const invalidData = { ...tournamentDataMock, maxTeams: 100, teamSize: 40 };
      const ix = await ixBuilder.createTournamentIx(organizer.publicKey, sponsor.publicKey, assetMint, invalidData);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [organizer]);
    } catch (error) {
      checkAnchorError(error, "Max players exceeded");
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
