import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { setupTest } from "../utils/setup_test";
import { getFeeVaultAddress, getMarketplaceAddress } from "../utils/pda";
import { calculateFees } from "../utils/utils";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  depositor: anchor.web3.Keypair,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const {
    program,
    provider,
    requestAirdrop,
    confirmTransaction,
    newTransaction,
  } = await setupTest(depositor, config.url);

  program.addEventListener("depositFeeEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(depositor.publicKey);
  }

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);
  const [feeVaultAddress] = getFeeVaultAddress(
    program.programId,
    marketplaceAddress
  );
  const depositAmount = LAMPORTS_PER_SOL;

  const marketplace = await program.account.marketplace.fetch(
    marketplaceAddress
  );
  let depositorATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    depositor,
    marketplace.utilityTokenMint,
    depositor.publicKey
  );

  await confirmTransaction(
    await mintTo(
      provider.connection,
      depositor,
      marketplace.utilityTokenMint,
      depositorATA.address,
      marketplaceOwner,
      2 * LAMPORTS_PER_SOL
    )
  );

  const feeVaultAmountBefore = (
    await getAccount(provider.connection, feeVaultAddress)
  ).amount;

  const tx = await newTransaction([
    await program.methods
      .depositFee(new anchor.BN(depositAmount))
      .transaction(),
  ]);

  tx.feePayer = depositor.publicKey;
  tx.sign(depositor);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const feeVaultAmountAfter = (
    await getAccount(provider.connection, feeVaultAddress)
  ).amount;

  expect(feeVaultAmountAfter, "Deposit wrong fee amount").deep.equal(
    feeVaultAmountBefore + BigInt(depositAmount)
  );

  return await calculateFees(provider.connection, tx);
};
