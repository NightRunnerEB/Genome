import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { getAdminKeyPairs, getProvider } from "./utils";

describe("Genome Contract Tests (initialize & createTournament)", () => {

  const GENOME_ROOT = Buffer.from("genome");
  const CONFIG = Buffer.from("config");
  const TOURNAMENT = Buffer.from("tournament");

  const provider = getProvider();

  const program = anchor.workspace.GenomeContract as Program<GenomeContract>;
  const adminKeypair = getAdminKeyPairs().admin;
  const organizerKeypair = Keypair.generate();
  const sponsorKeypair = Keypair.generate();
  let mintPubkey: PublicKey;
  let sponsorAtaPubkey: PublicKey;

  const configPda = PublicKey.findProgramAddressSync(
    [GENOME_ROOT, CONFIG],
    program.programId
  )[0];

  const tournamentDataMock = {
    organizer: organizerKeypair.publicKey,
    sponsor: sponsorKeypair.publicKey,
    sponsorPool: new anchor.BN(1000),
    organizerRoyalty: new anchor.BN(100),
    entryFee: new anchor.BN(20),
    registrationStart: new anchor.BN(12345678),
    teamSize: 10,
    minTeams: 4,
    maxTeams: 20,
    token: mintPubkey,
  };

  const createTournamentAndExpectError = async (
    overrideParams: Partial<typeof tournamentDataMock>,
    expectedRegex: RegExp
  ) => {
    const invalidData = { ...tournamentDataMock, ...overrideParams };
    try {
      await program.methods
        .createTournament(invalidData)
        .accounts({
          organizer: organizerKeypair.publicKey,
          sponsor: sponsorKeypair.publicKey,
          mint: mintPubkey,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([organizerKeypair, sponsorKeypair])
        .rpc();

      assert.fail("An error was expected, but the transaction was successful");
    } catch (err: any) {
      assert.match(err.toString(), expectedRegex);
    }
  };

  before(async () => {
    const sigAdmin = await provider.connection.requestAirdrop(
      adminKeypair.publicKey,
      3 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sigAdmin);

    const sigOrg = await provider.connection.requestAirdrop(
      organizerKeypair.publicKey,
      3 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sigOrg);

    const sigSponsor = await provider.connection.requestAirdrop(
      sponsorKeypair.publicKey,
      3 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sigSponsor);

    mintPubkey = await createMint(
      provider.connection,
      adminKeypair,
      adminKeypair.publicKey,
      null,
      6
    );
    tournamentDataMock.token = mintPubkey;
    const sponsorAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      adminKeypair,
      mintPubkey,
      sponsorKeypair.publicKey
    );
    sponsorAtaPubkey = sponsorAta.address;
    await mintTo(
      provider.connection,
      adminKeypair,
      mintPubkey,
      sponsorAtaPubkey,
      adminKeypair,
      100000000
    );
  });

  it("Initialize GenomeConfig", async () => {
    const configData = {
      admin: adminKeypair.publicKey,
      tournamentNonce: new anchor.BN(0),
      platformFee: new anchor.BN(10),
      platformWallet: adminKeypair.publicKey,
      minEntryFee: new anchor.BN(10),
      minSponsorPool: new anchor.BN(500),
      minTeams: 2,
      maxTeams: 20,
      maxOrganizerRoyalty: new anchor.BN(5000),
      mint: mintPubkey,
    };

    await program.methods
      .initialize(configData)
      .accounts({
        admin: adminKeypair.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc();

    const configAccount = await program.account.genomeConfig.fetch(configPda);
    assert.ok(configAccount != null);
    assert.equal(configAccount.minEntryFee.toNumber(), 10);
    assert.equal(configAccount.minSponsorPool.toNumber(), 500);
  });

  it("Create a Tournament", async () => {
    const configDataBefore = await program.account.genomeConfig.fetch(configPda);
    const nonceBuffer = configDataBefore.tournamentNonce.toArrayLike(Buffer, 'le', 16);
    const [tournamentPda] = PublicKey.findProgramAddressSync(
      [
        GENOME_ROOT,
        TOURNAMENT,
        nonceBuffer,
      ],
      program.programId
    );

    await program.methods
      .createTournament(tournamentDataMock)
      .accounts({
        organizer: organizerKeypair.publicKey,
        sponsor: sponsorKeypair.publicKey,
        mint: mintPubkey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([organizerKeypair, sponsorKeypair])
      .rpc();

    const configDataAfter = await program.account.genomeConfig.fetch(configPda);
    const tournamentAccount = await program.account.tournament.fetch(tournamentPda);

    assert.ok(tournamentAccount != null);
    assert.equal(tournamentAccount.id.toNumber(), configDataAfter.tournamentNonce.toNumber());
    assert.equal(tournamentAccount.sponsor.toBase58(), tournamentDataMock.sponsor.toBase58());
    assert.equal(tournamentAccount.sponsorPool.toNumber(), tournamentDataMock.sponsorPool.toNumber());
    assert.equal(tournamentAccount.organizerRoyalty.toNumber(), tournamentDataMock.organizerRoyalty.toNumber());
    assert.equal(tournamentAccount.entryFee.toNumber(), tournamentDataMock.entryFee.toNumber());
    assert.equal(tournamentAccount.registrationStart.toNumber(), tournamentDataMock.registrationStart.toNumber());
    assert.equal(tournamentAccount.teamSize, tournamentDataMock.teamSize);
    assert.equal(tournamentAccount.minTeams, tournamentDataMock.minTeams);
    assert.equal(tournamentAccount.maxTeams, tournamentDataMock.maxTeams);
    assert.equal(tournamentAccount.organizer.toBase58(), tournamentDataMock.organizer.toBase58());
    assert.equal(tournamentAccount.token.toBase58(), tournamentDataMock.token.toBase58());
  });

  it("Invalid organizerRoyalty", async () => {
    await createTournamentAndExpectError(
      { organizerRoyalty: new BN(9999999) },
      /InvalidRoyalty|custom program error/
    );
  });

  it("Invalid entry_fee", async () => {
    await createTournamentAndExpectError(
      { entryFee: new BN(1) },
      /InvalidAdmissionFee|custom program error/
    );
  });

  it("Invalid team limit (minTeams, maxTeams)", async () => {
    await createTournamentAndExpectError(
      { maxTeams: 100 },
      /InvalidTeamLimit|custom program error/
    );

    await createTournamentAndExpectError(
      { minTeams: 0 },
      /InvalidTeamLimit|custom program error/
    );
  });

  it("Invalid prize_pool param", async () => {
    await createTournamentAndExpectError(
      { sponsorPool: new BN(10) },
      /InvalidPrizePool|custom program error/
    );
  });

  it("Invalid team_size", async () => {
    await createTournamentAndExpectError(
      { teamSize: 1 },
      /InvalidTeamCapacity|custom program error/
    );
  });
});
