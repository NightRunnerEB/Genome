  import { getKeypairFromFile } from "@solana-developers/node-helpers";
  import * as anchor from "@coral-xyz/anchor";
  import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
  import { GenomeContract } from "../target/types/genome_contract";
  import config from "./config";
  import { prettify } from "./utils";

  async function main() {
    const adminPath = process.argv[2];
    const sponsorAddress = process.argv[3];
    const mintAddress = process.argv[4];

    const admin = await getKeypairFromFile(adminPath);
    const tournamentData = config.tournamentData;

    console.log(`admin = ${admin.publicKey.toBase58()}`);
    console.log(`sponsor = ${sponsorAddress}`);
    console.log(`mint = ${mintAddress}`);
    console.log(`tournamentData = ${prettify(tournamentData)}`);

    await createTournament(admin, sponsorAddress, mintAddress, tournamentData);
  }

  async function createTournament(
    organizer: anchor.web3.Keypair,
    sponsorAddress: string,
    mintAddress: string,
    staticTournamentData: any
  ) {
    const program = anchor.workspace
      .GenomeContract as anchor.Program<GenomeContract>;

    const mint = new anchor.web3.PublicKey(mintAddress);
    const sponsor = new anchor.web3.PublicKey(sponsorAddress);

    const tournamentData = {
      ...staticTournamentData,
      organizer: organizer.publicKey,
      sponsor,
      assetMint: mint,
    };

    console.log(`TOURNAM DATA = ${prettify(tournamentData)}`);

    const tx = await program.methods
      .createTournament(tournamentData)
      .accounts({
        organizer: organizer.publicKey,
        sponsor,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([organizer])
      .transaction();

    let provider = anchor.AnchorProvider.env();
    let txSignature = await provider.sendAndConfirm(tx, [organizer]);
    console.log(`Create tournament tx: ${txSignature}`);
  }

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
