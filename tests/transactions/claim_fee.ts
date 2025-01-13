import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";
import { setupTest } from "../utils/setup_test";
import { calculateFees } from "../utils/utils";
import { getFeeVaultAddress, getMarketplaceAddress } from "../utils/pda";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const {
    program,
    provider,
    requestAirdrop,
    confirmTransaction,
    newTransaction,
  } = await setupTest(marketplaceOwner, config.url);

  program.addEventListener("claimFeeEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);
  const [feeVaultAddress] = getFeeVaultAddress(
    program.programId,
    marketplaceAddress
  );

  const marketplace = await program.account.marketplace.fetch(
    marketplaceAddress
  );

  const claimer = anchor.web3.Keypair.generate();

  await requestAirdrop(claimer.publicKey);

  // Create or Get Knowledge Token ATA for claimer
  let claimerATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    claimer,
    marketplace.utilityTokenMint,
    claimer.publicKey
  );

  await confirmTransaction(
    await mintTo(
      provider.connection,
      marketplaceOwner,
      marketplace.utilityTokenMint,
      feeVaultAddress,
      marketplaceOwner,
      LAMPORTS_PER_SOL
    )
  );

  const tx = await newTransaction([
    await program.methods
      .claimFee(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        claimFeeDestination: claimerATA.address,
      })
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  await calculateFees(provider.connection, tx);

  const claimerATAAfter = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    claimer,
    marketplace.utilityTokenMint,
    claimer.publicKey
  );

  assert.strictEqual(
    claimerATAAfter.amount,
    BigInt(LAMPORTS_PER_SOL),
    "Claimed wrong fee amount"
  );

  return await calculateFees(provider.connection, tx);
};
