import { ComputeBudgetProgram } from "@solana/web3.js";
import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import { EXPONENTIAL_FACTOR, PRECISION, PRICE_COEFFICIENT } from "../const";
import { expect } from "chai";
import {
  calculateFees,
  calculateUtilityTokenAmount,
  numberFromBN,
  numberToBN,
} from "../utils/utils";
import {
  getFeeVaultAddress,
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getKnowledgeTokenReserveAddress,
  getMarketplaceAddress,
} from "../utils/pda";
import { getAccount } from "@solana/spl-token";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  seller: anchor.web3.Keypair
) => {
  const {
    program,
    confirmTransaction,
    provider,
    newTransaction,
    requestAirdrop,
  } = await setupTest(seller, config.url);

  program.addEventListener("sellTokenEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(seller.publicKey);
  }

  const [knowledgeTokenMint] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMint
  );
  const [marketplaceAddress] = getMarketplaceAddress(program.programId);
  const [feeVaultAddress] = getFeeVaultAddress(
    program.programId,
    marketplaceAddress
  );
  const [knowledgeTokenReserveAddress] = getKnowledgeTokenReserveAddress(
    program.programId,
    knowledgeSwapAddress
  );

  const sellKnowledgeTokenAmount = new anchor.BN(50 * PRECISION);
  const feeVaultTokenAccountBefore = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  const knowledgeSwap = await program.account.swap.fetch(knowledgeSwapAddress);

  if (!knowledgeSwap) {
    expect(knowledgeSwap, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const utilityTokenBefore = knowledgeSwap.utilityTokenCurrentAmount;

  const expectedKnowledgeTokenAmount =
    knowledgeSwap.knowledgeTokenCurrentAmount.sub(sellKnowledgeTokenAmount);

  const expectedRemainingUtilityTokenAmount = Math.floor(
    calculateUtilityTokenAmount(
      numberFromBN(expectedKnowledgeTokenAmount),
      EXPONENTIAL_FACTOR,
      PRICE_COEFFICIENT
    )
  );

  const knowledgeTokenReserveBalance = (
    await provider.connection.getTokenAccountBalance(
      knowledgeTokenReserveAddress
    )
  ).value.amount;

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction([
    computeBudgetInstruction,
    await program.methods
      .sellToken(
        sellKnowledgeTokenAmount,
        new anchor.BN(
          (utilityTokenBefore.toNumber() -
            expectedRemainingUtilityTokenAmount) *
            0.99
        )
      )
      .accounts({
        knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
      })
      .transaction(),
  ]);

  tx.feePayer = seller.publicKey;
  tx.sign(seller);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const expectedTradeFee = (() => {
    if (knowledgeSwap.swapFee.tradeFeeType.percentage) {
      const fee = Math.floor(
        (knowledgeSwap.swapFee.tradeFee.toNumber() *
          (utilityTokenBefore.toNumber() -
            expectedRemainingUtilityTokenAmount)) /
          PRECISION
      );

      return fee ? fee : 1;
    }

    if (knowledgeSwap.swapFee.tradeFeeType.fixed)
      return knowledgeSwap.swapFee.tradeFee.toNumber();

    return 0;
  })();

  const feeVaultTokenAccountAfter = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  const realTradeFee =
    feeVaultTokenAccountAfter.amount - feeVaultTokenAccountBefore.amount;

  const knowledgeSwapAfter = await program.account.swap.fetch(
    knowledgeSwapAddress
  );

  if (!knowledgeSwapAfter) {
    expect(knowledgeSwapAfter, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const realRemainingKnowledgeTokenAmount =
    knowledgeSwapAfter.knowledgeTokenCurrentAmount;

  const realRemainingUtilityTokenAmount =
    knowledgeSwapAfter.utilityTokenCurrentAmount;

  const expectedKnowledgeTokenReserveIncreasing = numberToBN(
    knowledgeTokenReserveBalance
  )
    .add(sellKnowledgeTokenAmount)
    .toString();

  const realKnowledgeTokenReserveRemaining = (
    await provider.connection.getTokenAccountBalance(
      knowledgeTokenReserveAddress
    )
  ).value.amount.toString();

  expect(
    realRemainingKnowledgeTokenAmount.toNumber(),
    "Mismatch remain knowledge token supply amount"
  ).equal(expectedKnowledgeTokenAmount.toNumber());
  expect(
    expectedKnowledgeTokenReserveIncreasing,
    "Mismatch increasing knowledge token reserve amount"
  ).is.deep.equal(realKnowledgeTokenReserveRemaining);
  expect(
    realRemainingUtilityTokenAmount.toNumber(),
    "Received utility token amount"
  ).equal(expectedRemainingUtilityTokenAmount);
  expect(realTradeFee, "Mismatch trade fee").deep.equal(
    BigInt(expectedTradeFee)
  );

  return await calculateFees(provider.connection, tx);
};
