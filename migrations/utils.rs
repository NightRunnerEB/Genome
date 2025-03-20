import { utf8 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { PublicKey, web3 } from "@coral-xyz/anchor";
import { GenomeContract } from "../target/types/genome_contract";
import * as anchor from "@coral-xyz/anchor";

export const GENOME_ROOT = utf8.encode("genome");
export const CONFIG = utf8.encode("config");
export const TOURNAMENT = utf8.encode("tournament");

export function getGenomePda(): PublicKey {
  const program = anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, CONFIG],
    program.programId
  )[0];
}

export function getTournamentPda(tournamentNonce: number): PublicKey {
  const program = anchor.workspace.GenomeContract as anchor.Program<GenomeContract>;
  const nonceBuffer = new Uint8Array(new Uint32Array([tournamentNonce]).buffer);
  return PublicKey.findProgramAddressSync(
    [GENOME_ROOT, TOURNAMENT, nonceBuffer],
    program.programId
  )[0];
}
