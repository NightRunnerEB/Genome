import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { GenomeContract } from "../target/types/genome_contract";
import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const GENOME_ROOT = utf8.encode("genome");
const CONFIG = utf8.encode("config");

/**
 * Make object pretty for logging
 * @param obj Input object which should be prettified
 * @returns Well formatted string
 */
export function prettify(obj: any): string {
  let prettyObj: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const targetType = typeof obj[key];
      if (obj[key] instanceof BN) {
        prettyObj[key] = obj[key].toNumber();
      } else {
        prettyObj[key] = obj[key];
      }
    }
  }

  return JSON.stringify(prettyObj, null, 2);
}

export function getGonfigPda(): PublicKey {
  const genomeProgram = anchor.workspace
    .GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, CONFIG],
    genomeProgram.programId
  )[0];
}