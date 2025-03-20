import * as assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TxBuilder } from "./txBuilder";
import {
  airdrop,
  getKeyPairs,
  createGenomeMint,
  delegateAccount,
  createInvalidTournament,
  getPrizePoolAta,
  getSponsorAta,
} from "./utils";

describe("Genome Solana Singlechain", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const { admin, organizer, sponsor, token } = getKeyPairs();
  let mint: PublicKey;
  let sponsorAta: PublicKey;
  const txBuilder = new TxBuilder();

  const tournamentDataMock = {
    organizer: organizer.publicKey,
    sponsor: sponsor.publicKey,
    organizerRoyalty: new anchor.BN(100),
    sponsorPool: new anchor.BN(1000),
    entryFee: new anchor.BN(20),
    teamSize: 10,
    minTeams: 4,
    maxTeams: 10,
    token: token.publicKey,
  };

  const configData = {
    admin: admin.publicKey,
    tournamentNonce: 0,
    platformFee: new anchor.BN(10),
    platformWallet: admin.publicKey,
    minEntryFee: new anchor.BN(10),
    minSponsorPool: new anchor.BN(500),
    minTeams: 2,
    maxTeams: 20,
    falsePrecision: 0.000065,
    maxOrganizerRoyalty: new anchor.BN(5000),
  };

  before(async () => {
    await Promise.all(
      [admin, organizer, sponsor].map(
        async (keypair) => await airdrop(keypair.publicKey, 10)
      )
    );
  });

  it("Create mint", async () => {
    ({ mint, sponsorAta } = await createGenomeMint());
  });

  it("Delegate", async () => {
    let delegate = await delegateAccount(sponsorAta);
    console.log("Initialize delegate tx: ", delegate);
  });

  it("Initialize Genome Solana", async () => {
    let tx = await txBuilder.initialize(admin, configData);
    console.log("Initialize Genome tx: ", tx);

    const configAccount = await txBuilder.getConfig();
    assert.ok(configAccount != null);
    assert.equal(configAccount.admin.toBase58(), configData.admin.toBase58());
    assert.equal(
      configAccount.platformWallet.toBase58(),
      configData.platformWallet.toBase58()
    );
    assert.equal(configAccount.falsePrecision, configData.falsePrecision);
    assert.equal(
      configAccount.platformFee.toNumber(),
      configData.platformFee.toNumber()
    );
    assert.equal(
      configAccount.minEntryFee.toNumber(),
      configData.minEntryFee.toNumber()
    );
    assert.equal(
      configAccount.minSponsorPool.toNumber(),
      configData.minSponsorPool.toNumber()
    );
    assert.equal(
      configAccount.maxOrganizerRoyalty.toNumber(),
      configData.maxOrganizerRoyalty.toNumber()
    );
    assert.equal(configAccount.tournamentNonce, configData.tournamentNonce);
    assert.equal(configAccount.minTeams, configData.minTeams);
    assert.equal(configAccount.maxTeams, configData.maxTeams);
  });

  it("Create a Tournament", async () => {
    const sponsorAtaBefore = await getSponsorAta(sponsorAta);
    let tx = await txBuilder.createTournamentSinglechain(
      organizer,
      sponsor,
      mint,
      tournamentDataMock
    );
    console.log("Initialize createTournament tx: ", tx);

    const sponsorAtaAfter = await getSponsorAta(sponsorAta);
    const configData = await txBuilder.getConfig();
    const tournamentAccount = await txBuilder.getTournament(
      configData.tournamentNonce - 1
    );

    assert.ok(tournamentAccount != null);
    assert.equal(tournamentAccount.id, configData.tournamentNonce - 1);
    assert.equal(
      tournamentAccount.sponsor.toBase58(),
      tournamentDataMock.sponsor.toBase58()
    );
    assert.equal(
      tournamentAccount.sponsorPool.toNumber(),
      tournamentDataMock.sponsorPool.toNumber()
    );
    assert.equal(
      tournamentAccount.organizerRoyalty.toNumber(),
      tournamentDataMock.organizerRoyalty.toNumber()
    );
    assert.equal(
      tournamentAccount.entryFee.toNumber(),
      tournamentDataMock.entryFee.toNumber()
    );
    assert.ok(tournamentAccount.status.new);
    assert.equal(tournamentAccount.teamSize, tournamentDataMock.teamSize);
    assert.equal(tournamentAccount.minTeams, tournamentDataMock.minTeams);
    assert.equal(tournamentAccount.maxTeams, tournamentDataMock.maxTeams);
    assert.equal(
      tournamentAccount.organizer.toBase58(),
      tournamentDataMock.organizer.toBase58()
    );
    assert.equal(
      tournamentAccount.token.toBase58(),
      tournamentDataMock.token.toBase58()
    );

    const prizePoolAta = await getPrizePoolAta(
      mint,
      tournamentAccount.tournamentPda
    );
    assert.equal(
      sponsorAtaBefore.amount - sponsorAtaAfter.amount,
      prizePoolAta.amount
    );
  });

  it("Invalid organizerRoyalty", async () => {
    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, organizerRoyalty: new anchor.BN(9999999) },
      /InvalidRoyalty/
    );
  });

  it("Invalid entry_fee", async () => {
    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, entryFee: new anchor.BN(1) },
      /InvalidAdmissionFee/
    );
  });

  it("Invalid team limit (minTeams, maxTeams)", async () => {
    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, maxTeams: 100 },
      /InvalidTeamsCount/
    );

    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, minTeams: 0 },
      /InvalidTeamsCount/
    );
  });

  it("Invalid prize_pool param", async () => {
    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, sponsorPool: new anchor.BN(10) },
      /InvalidSponsorPool/
    );
  });

  it("Invalid tournament capacity", async () => {
    await createInvalidTournament(
      txBuilder,
      { ...tournamentDataMock, maxTeams: 100, teamSize: 40 },
      /MaxPlayersExceeded/
    );
  });
});
