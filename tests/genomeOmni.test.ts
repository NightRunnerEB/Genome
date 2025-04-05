import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

import { checkAnchorError, getKeypairs, MARKS } from "./utils";
import {
  buildAndSendTx,
  GENOME_OMNI_CONFIG,
  getGenomePda,
  getProgram,
  IxBuilder,
} from "../common/ixBuilder";

describe("Genome Solana Omnichain", () => {
  const UTS_PROGRAM = new anchor.web3.PublicKey(
    require("../keys/uts-program.json")
  );
  const BRIDGE_FEE = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL / 100);
  const GENOME_L2_CHAIN_ID = new anchor.BN(491149);

  let deployer: anchor.web3.Keypair;
  let admin: anchor.web3.Keypair;
  let attacker: anchor.web3.Keypair;
  let ixBuilder: IxBuilder;

  before(async () => {
    ({ deployer, admin, attacker } = await getKeypairs());
    ixBuilder = new IxBuilder();
  });

  it(`Initialize Genome Omnichain [${MARKS.required}]`, async () => {
    const bridgeFee = new anchor.BN(1234567);
    const ix = await ixBuilder.initializeOmnichain(deployer, {
      admin: admin.publicKey,
      utsProgram: UTS_PROGRAM,
      bridgeFee: bridgeFee,
      genomeChainId: GENOME_L2_CHAIN_ID,
    });
    const tx = await buildAndSendTx([ix], [deployer]);
    console.log("Initialize omni tx: ", tx);

    let omniConfig = await getGenomePda([GENOME_OMNI_CONFIG]);
    const cfg = await getProgram().account.genomeOmniConfig.fetch(omniConfig);
    assert.deepEqual(cfg.utsProgram, UTS_PROGRAM);
    assert.deepEqual(cfg.admin, admin.publicKey);
    assert.equal(cfg.bridgeFee.toNumber(), bridgeFee.toNumber());
    assert.equal(cfg.genomeChainId.toNumber(), GENOME_L2_CHAIN_ID.toNumber());
  });

  it(`Should fail reinitializing Genome Omnichain [${MARKS.negative}]`, async () => {
    try {
      const ix = await ixBuilder.initializeOmnichain(deployer, {
        admin: anchor.web3.Keypair.generate().publicKey,
        utsProgram: anchor.web3.Keypair.generate().publicKey,
        bridgeFee: new anchor.BN(1234567),
        genomeChainId: new anchor.BN(7654321),
      });
      await buildAndSendTx([ix], [deployer]);
      assert.fail("Expected error while reinitializing");
    } catch (error) {
      checkAnchorError(error, "custom program error: 0x0");
    }
  });

  it(`Set bridge fee [${MARKS.required}]`, async () => {
    const ix = await ixBuilder.setBridgeFee(admin, BRIDGE_FEE);
    const tx = await buildAndSendTx([ix], [admin]);
    console.log("Set bridge fee tx: ", tx);

    let omniConfig = await getGenomePda([GENOME_OMNI_CONFIG]);
    const cfg = await getProgram().account.genomeOmniConfig.fetch(omniConfig);
    assert.equal(cfg.bridgeFee.toNumber(), BRIDGE_FEE.toNumber());
  });

  it(`Should fail for attacker trying to set bridge fee [${MARKS.negative}]`, async () => {
    try {
      const ix = await ixBuilder.setBridgeFee(attacker, new anchor.BN(1234321));
      await buildAndSendTx([ix], [attacker]);
    } catch (error) {
      checkAnchorError(error, "Signer is not allowed");
    }
  });
});
