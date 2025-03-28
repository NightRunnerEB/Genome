import * as anchor from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";

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
      if (obj[key] instanceof anchor.BN) {
        prettyObj[key] = obj[key].toNumber();
      } else {
        prettyObj[key] = obj[key];
      }
    }
  }

  return JSON.stringify(prettyObj, null, 2);
}

export function getProgram() {
  return anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;
}