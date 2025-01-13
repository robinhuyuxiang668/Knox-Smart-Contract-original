import { PublicKey } from "@solana/web3.js";
import {
  OBSERVATION_SEED,
  POOL_SEED,
  POOL_VAULT_SEED,
} from "@raydium-io/raydium-sdk-v2";

export const POOL_LPMINT_SEED = Buffer.from("pool_lp_mint");
export const POOL_AUTH_SEED = Buffer.from("vault_and_lp_mint_auth_seed");
export const MARKETPLACE_SEED = Buffer.from("marketplace");
export const KNOWLEDGE_SWAP_SEED = Buffer.from("knowledge_swap");
export const KNOWLEDGE_TOKEN_MINT_SEED = Buffer.from("knowledge_token_mint");
export const TOKEN_VESTING_SEED = Buffer.from("token_vesting");
export const UTILITY_TOKEN_RESERVE_SEED = Buffer.from("utility_token_reserve");
export const FEE_VAULT_SEED = Buffer.from("fee_vault");
export const KNOWLEDGE_TOKEN_RESERVE_SEED = Buffer.from(
  "knowledge_token_reserve"
);

export function getKnowledgeTokenReserveAddress(
  program: PublicKey,
  knowledgeSwapAddress: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [KNOWLEDGE_TOKEN_RESERVE_SEED, knowledgeSwapAddress.toBuffer()],
    program
  );
}

export function getFeeVaultAddress(
  program: PublicKey,
  marketplaceAddress: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [FEE_VAULT_SEED, marketplaceAddress.toBuffer()],
    program
  );
}

export function getKnowledgeTokenMintAddress(program: PublicKey, hash: String) {
  return PublicKey.findProgramAddressSync(
    [KNOWLEDGE_TOKEN_MINT_SEED, Buffer.from(hash)],
    program
  );
}

export function getUtilityTokenReserveAddress(
  program: PublicKey,
  knowledgeSwapAddress: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [UTILITY_TOKEN_RESERVE_SEED, knowledgeSwapAddress.toBuffer()],
    program
  );
}

export function getMarketplaceAddress(program: PublicKey) {
  return PublicKey.findProgramAddressSync([MARKETPLACE_SEED], program);
}

export function getKnowledgeSwapAddress(
  program: PublicKey,
  knowledgeTokenMintAddress: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [KNOWLEDGE_SWAP_SEED, knowledgeTokenMintAddress.toBuffer()],
    program
  );
}

export function getTokenVestingAddress(
  program: PublicKey,
  ownerAddress: PublicKey,
  knowledgeTokenMintAddress: PublicKey
) {
  return PublicKey.findProgramAddressSync(
    [
      TOKEN_VESTING_SEED,
      ownerAddress.toBuffer(),
      knowledgeTokenMintAddress.toBuffer(),
    ],
    program
  );
}

export function getRaydiumPoolAddress(
  ammConfig: PublicKey,
  tokenMint0: PublicKey,
  tokenMint1: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      POOL_SEED,
      ammConfig.toBuffer(),
      tokenMint0.toBuffer(),
      tokenMint1.toBuffer(),
    ],
    programId
  );
}

export async function getRaydiumPoolLpMintAddress(
  pool: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddressSync(
    [POOL_LPMINT_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
}

export async function getRaydiumAuthAddress(
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddressSync(
    [POOL_AUTH_SEED],
    programId
  );
  return [address, bump];
}

export async function getPoolLpMintAddress(
  pool: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddressSync(
    [POOL_LPMINT_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
}

export async function getPoolVaultAddress(
  pool: PublicKey,
  vaultTokenMint: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED, pool.toBuffer(), vaultTokenMint.toBuffer()],
    programId
  );
  return [address, bump];
}

export async function getOrcleAccountAddress(
  pool: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const [address, bump] = await PublicKey.findProgramAddressSync(
    [OBSERVATION_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
}
