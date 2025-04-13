import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableProgram,
  sendAndConfirmTransaction,
  SignatureStatus,
  TransactionConfirmationStatus,
  Connection,
  TransactionSignature,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as assert from "assert";
import { describe, it } from "mocha";
import { IxBuilder } from "../../common/ixBuilder";
import {
  getKeyPairs,
  checkAnchorError,
  sleep,
  MARKS,
} from "../utils";
import { getTournament, airdropAll, buildAndSendTx, getProvider, getGenomePda, TEAM } from "../../common/utils";

const CONNECTION = getProvider().connection;

describe("Start Tournament", () => {
  const tournamentId = 0; // team_size = 2
  let lookupTableAddress1: PublicKey,
      lookupTableAddress2: PublicKey;
  let teamPDAs: PublicKey[] = [];
  let ixBuilder: IxBuilder;
  let deployer: Keypair,
    verifier1: Keypair,
    verifier2: Keypair,
    organizer: Keypair,
    captain1: Keypair,
    mockCaptains: Keypair[],
    participant: Keypair,
    admin: Keypair,
    token: Keypair;

  before(async () => {
    ixBuilder = new IxBuilder();
    const keys = await getKeyPairs();
    deployer = keys.deployer;
    verifier1 = keys.verifier1;
    verifier2 = keys.verifier2;
    organizer = keys.organizer;
    captain1 = keys.captain1;
    mockCaptains = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
    participant = keys.participant1;
    admin = keys.admin;
    token = keys.token;


    await airdropAll(
      [
        deployer.publicKey,
        verifier1.publicKey,
        verifier2.publicKey,
        organizer.publicKey,
        ...mockCaptains.map((k) => k.publicKey),
      ],
      10
    );

    for (const cap of mockCaptains) {
      const ata = await createAssociatedTokenAccount(
        CONNECTION,
        cap,
        token.publicKey,
        cap.publicKey,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await mintTo(
        CONNECTION,
        cap,
        token.publicKey,
        ata,
        admin,
        1000000000000000,
        [],
        {},
        TOKEN_PROGRAM_ID
      );
    }

    for (const cap of mockCaptains) {
      const registerParams = {
        tournamentId,
        participant: cap.publicKey,
        captain: cap.publicKey,
        teammates: []
      };
      const regIx = await ixBuilder.registerTournamentIx(registerParams);
      await buildAndSendTx([regIx], [cap]);
    }

    const idBuffer = Buffer.alloc(4);
    idBuffer.writeUInt32LE(tournamentId, 0);
    for (const cap of mockCaptains) {
      const teamPda = await getGenomePda([TEAM, Buffer.from(tournamentId.toString()), cap.publicKey.toBuffer()]);
      teamPDAs.push(teamPda);
    }
  });

  it(`Create AddressLookupTable [${MARKS.required}]`, async () => {
    lookupTableAddress1 = await createLookupTable(verifier1);
    await addAddressesToTable(lookupTableAddress1, verifier1, teamPDAs);

    await sleep(250000);
    lookupTableAddress2 = await createLookupTable(verifier2);
    await addAddressesToTable(lookupTableAddress2, verifier2, teamPDAs);
  });

  // it("should fail to start tournament if remaining accounts count is insufficient", async () => {
  //   const insufficientDummies: AccountMeta[] = dummyKeys.slice(0, 1).map((k) => ({
  //     pubkey: k.publicKey,
  //     isSigner: false,
  //     isWritable: true,
  //   }));

  //   const startIx = await ixBuilder.startTournamentIx(verifier1.publicKey, tournamentId);
  //   startIx.keys = startIx.keys.concat(insufficientDummies);

  //   try {
  //     await buildAndSendTx([startIx], [verifier1]);
  //     throw new Error("Expected error was not thrown");
  //   } catch (error) {
  //     checkAnchorError(error, "InvalidTeamsCount");
  //   }
  // });

  it(`Start tournament, then allow reward claim [${MARKS.required}]`, async () => {
    await sleep(10000);
    const lookupTable1 = (await CONNECTION.getAddressLookupTable(lookupTableAddress1)).value;
    const startIx1 = await ixBuilder.startTournamentIx(verifier1.publicKey, tournamentId);
    await createAndSendV0TxWithALT([startIx1], lookupTable1, verifier1);

    try {
      const claimRewardIx = await ixBuilder.claimRewardIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
      await buildAndSendTx([claimRewardIx], [mockCaptains[0]]);
      throw new Error("Expected error for premature claim not thrown");
    } catch (error) {
      checkAnchorError(error, "Invalid tournament status");
    }

    const lookupTable2 = (await CONNECTION.getAddressLookupTable(lookupTableAddress1)).value;
    const startIx2 = await ixBuilder.startTournamentIx(verifier2.publicKey, tournamentId);
    await createAndSendV0TxWithALT([startIx2], lookupTable2, verifier2);
    // console.log("Start tournament tx (verifier2):", txSig2);

    const tournamentAfter = await getTournament(tournamentId);
    assert.ok(tournamentAfter.status.started, "Tournament should be started");
  });

  it(`CLaim refund [${MARKS.required}]`, async () => {
    const claimRewardIx = await ixBuilder.claimRefundIx(mockCaptains[0].publicKey, tournamentId, mockCaptains[0].publicKey);
    const claimTxSig = await buildAndSendTx([claimRewardIx], [mockCaptains[0]]);
    console.log("Claim refund tx signature:", claimTxSig);
  });
});

async function createAndSendV0Tx(txInstructions: TransactionInstruction[], payer: Keypair) {
  let latestBlockhash = await CONNECTION.getLatestBlockhash('confirmed');
  const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: txInstructions
  }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer]);
  const txid = await CONNECTION.sendTransaction(transaction, { maxRetries: 5 });
  const confirmation = await confirmTransaction(CONNECTION, txid);
  if (confirmation.err) { throw new Error(" Transaction not confirmed.") }
}

async function confirmTransaction(
  connection: Connection,
  signature: TransactionSignature,
  desiredConfirmationStatus: TransactionConfirmationStatus = 'confirmed',
  timeout: number = 30000,
  pollInterval: number = 1000,
  searchTransactionHistory: boolean = false
): Promise<SignatureStatus> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
      const { value: statuses } = await connection.getSignatureStatuses([signature], { searchTransactionHistory });
      if (!statuses || statuses.length === 0) {
          throw new Error('Failed to get signature status');
      }
      const status = statuses[0];
      if (status === null) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
      }
      if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (status.confirmationStatus && status.confirmationStatus === desiredConfirmationStatus) {
          return status;
      }
      if (status.confirmationStatus === 'finalized') {
          return status;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
}

async function createLookupTable(payer: Keypair): Promise<PublicKey> {
  const [lookupTableInst, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
          authority: payer.publicKey,
          payer: payer.publicKey,
          recentSlot: await CONNECTION.getSlot("confirmed"),
      });

  await createAndSendV0Tx([lookupTableInst], payer);

  return lookupTableAddress;
}

// мы можем передать только около 20 аккаунтов, если больше, то нужно выполнить эту транзакцию нужное количество раз.
async function addAddressesToTable(alt: PublicKey, payer: Keypair, accounts: PublicKey[]) {
  const addAddressesInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: payer.publicKey,
      authority: payer.publicKey,
      lookupTable: alt,
      addresses: accounts,
  });
  await createAndSendV0Tx([addAddressesInstruction], payer);
}

async function createAndSendV0TxWithALT(txInstructions: TransactionInstruction[], lookupTable: AddressLookupTableAccount, payer: Keypair): Promise<String> {
  let latestBlockhash = await CONNECTION.getLatestBlockhash('confirmed');
  const messageWithLookupTable = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: txInstructions
  }).compileToV0Message([lookupTable]);
  const transactionWithLookupTable = new VersionedTransaction(messageWithLookupTable);
  transactionWithLookupTable.sign([payer]);
  const txid = await CONNECTION.sendTransaction(transactionWithLookupTable, { maxRetries: 5 });
  const confirmation = await confirmTransaction(CONNECTION, txid);
  if (confirmation.err) { throw new Error(" Transaction not confirmed.") }

  return txid
}
