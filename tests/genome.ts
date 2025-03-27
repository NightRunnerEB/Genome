import * as assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TxBuilder } from "./txBuilder";
import {
  airdrop,
  getKeyPairs,
  createGenomeMint,
  delegateAccount,
  getPrizePoolAta,
  getSponsorAta,
  checkAnchorError,
} from "./utils";

describe("Genome Solana Singlechain", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const { admin, deployer, organizer, sponsor, token, nome, verifier1, verifier2, verifier3, operator } = getKeyPairs();
  let assetMint: PublicKey;
  let sponsorAta: PublicKey;
  const txBuilder = new TxBuilder();

  const tournamentDataMock = {
    organizer: organizer.publicKey,
    sponsor: sponsor.publicKey,
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
    platformWallet: admin.publicKey,
    nomeMint: nome.publicKey,
    minTeams: 2,
    maxTeams: 20,
    falsePrecision: 0.000065,
    maxOrganizerFee: new anchor.BN(5000),
    consensusRate: 66.0,
    verifierAddresses: [verifier1.publicKey, verifier2.publicKey]
  };

  before(async () => {
    await Promise.all(
      [admin, deployer, organizer, sponsor, operator, verifier1, verifier2, verifier3].map(
        async (keypair) => await airdrop(keypair.publicKey, 10)
      )
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
    let tx = await txBuilder.initialize(deployer, configData);
    console.log("Initialize Genome tx: ", tx);

    const config = await txBuilder.getConfig();
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
    let tx = await txBuilder.grantRole(admin, operator, { operator: {} })
    console.log("Grant operator role tx: ", tx);

    const userRole = await txBuilder.getUserRole(operator.publicKey);
    assert.ok(userRole.role.operator);
  });

  it("Add new Vefifier", async () => {
    const configBefore = await txBuilder.getConfig();
    let tx = await txBuilder.grantRole(admin, verifier3, { verifier: {} })
    console.log("Add new Vefifier tx: ", tx);

    const configAfter = await txBuilder.getConfig();
    const userRole = await txBuilder.getUserRole(verifier3.publicKey);
    assert.ok(userRole.role.verifier);
    assert.equal(configBefore.verifierAddresses.length + 1, configAfter.verifierAddresses.length);
  });

  it("Grant Organizer Role", async () => {
    let tx = await txBuilder.grantRole(admin, organizer, { organizer: {} })
    console.log("Grant operator role tx: ", tx);

    const userRole = await txBuilder.getUserRole(organizer.publicKey);
    assert.ok(userRole.role.organizer);
  });

  it("Approve Token", async () => {
    const minSponsorPool = new anchor.BN(1000);
    const minEntryPool = new anchor.BN(100);
    let tx = await txBuilder.approveToken(operator, token, minSponsorPool, minEntryPool);
    console.log("Approve Token tx: ", tx);

    const tokenInfo = await txBuilder.getTokenInfo(token.publicKey);
    assert.deepEqual(tokenInfo.assetMint, token.publicKey);
    assert.equal(tokenInfo.minEntryPool.toNumber(), minEntryPool.toNumber());
    assert.equal(tokenInfo.minSponsorPool.toNumber(), minSponsorPool.toNumber());
  });

  it("Ban Token", async () => {
    let tx = await txBuilder.banToken(operator, token, true);
    console.log("Ban Token tx: ", tx);

    try{
      await txBuilder.getTokenInfo(token.publicKey);
    } catch(error) {
      checkAnchorError(error, "Account does not exist");
    }
  });

  it("Revoke Role", async () => {
    let tx = await txBuilder.revokeRole(admin, operator);
    console.log("Revoke operator role tx: ", tx);
    try {
      await txBuilder.getUserRole(operator.publicKey);
    } catch (error) {
        checkAnchorError(error, "Account does not exist");
    }

    const configBefore = await txBuilder.getConfig();
    tx = await txBuilder.revokeRole(admin, verifier3);
    console.log("Revoke verifier role tx: ", tx);
    try {
      await txBuilder.getUserRole(verifier3.publicKey);
    } catch (error) {
      checkAnchorError(error, "Account does not exist");
    }
    const configAfter = await txBuilder.getConfig();
    assert.equal(configBefore.verifierAddresses.length - 1, configAfter.verifierAddresses.length);
  });
});
