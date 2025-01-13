import { LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import { EXPONENTIAL_FACTOR, PRECISION, PRICE_COEFFICIENT } from "../const";
import { expect } from "chai";
import { getAccount, mintTo } from "@solana/spl-token";
import {
  calculateFees,
  calculateUtilityTokenAmount,
  numberFromBN,
} from "../utils/utils";
import {
  getFeeVaultAddress,
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getMarketplaceAddress,
  getUtilityTokenReserveAddress,
} from "../utils/pda";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  marketplaceOwner: anchor.web3.Keypair
) => {
  const {
    program,
    provider,
    confirmTransaction,
    newTransaction,
    requestAirdrop,
  } = await setupTest(marketplaceOwner, config.url);

  program.addEventListener("claimFreeTokenEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(marketplaceOwner.publicKey);
  }

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);
  const [knowledgeTokenMintAddress] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
  );
  const [utilityTokenReserveAddress] = getUtilityTokenReserveAddress(
    program.programId,
    knowledgeSwapAddress
  );
  const [feeVaultAddress] = getFeeVaultAddress(
    program.programId,
    marketplaceAddress
  );

  const claimAmount = new anchor.BN(LAMPORTS_PER_SOL);

  const knowledgeSwapBefore = await program.account.swap.fetch(
    knowledgeSwapAddress
  );

  const newKnowledgeTokenAmount =
    knowledgeSwapBefore.knowledgeTokenCurrentAmount.add(claimAmount);

  let newUtilityTokenAmount = calculateUtilityTokenAmount(
    numberFromBN(newKnowledgeTokenAmount),
    EXPONENTIAL_FACTOR,
    PRICE_COEFFICIENT
  );

  let requiredUtilityTokenAmount =
    newUtilityTokenAmount -
    numberFromBN(knowledgeSwapBefore.utilityTokenCurrentAmount);

  const utilityAmountInReserveBefore = Number(
    (await getAccount(provider.connection, utilityTokenReserveAddress)).amount
  );

  await confirmTransaction(
    await mintTo(
      provider.connection,
      marketplaceOwner,
      knowledgeSwapBefore.utilityTokenMint,
      feeVaultAddress,
      marketplaceOwner,
      100 * PRECISION
    )
  );

  const feeVaultAmountBefore = Number(
    (await getAccount(provider.connection, feeVaultAddress)).amount
  );

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction([
    computeBudgetInstruction,
    await program.methods
      .claimFreeToken(claimAmount)
      .accounts({
        knowledgeTokenMint: knowledgeTokenMintAddress,
      })
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const knowledgeSwapAfter = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );

  if (!knowledgeSwapAfter) {
    expect(knowledgeSwapAfter, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const utilityAmountInReserveAfter = Number(
    (await getAccount(provider.connection, utilityTokenReserveAddress)).amount
  );

  const realUtilityAmountInReserve =
    utilityAmountInReserveAfter - utilityAmountInReserveBefore;
  const expectedUtilityAmountInReserve = Math.floor(requiredUtilityTokenAmount);

  const realKnowledgeTokenCurrentAmountInKS = numberFromBN(
    knowledgeSwapAfter.knowledgeTokenCurrentAmount
  );
  const expectedKnowledgeTokenCurrentAmountInKS = numberFromBN(
    newKnowledgeTokenAmount
  );

  const realUtilityTokenCurrentAmountInKS = numberFromBN(
    knowledgeSwapAfter.utilityTokenCurrentAmount
  );
  const expectedUtilityTokenCurrentAmountInKS = Math.floor(
    newUtilityTokenAmount
  );

  const realFeeVaultAmount = Number(
    (await getAccount(provider.connection, feeVaultAddress)).amount
  );
  const expectedFeeVaultAmount =
    feeVaultAmountBefore - Math.floor(requiredUtilityTokenAmount);

  expect(
    realUtilityAmountInReserve,
    "Mismatch Increasing utility token reserve amount"
  ).is.deep.equal(expectedUtilityAmountInReserve);
  expect(
    realKnowledgeTokenCurrentAmountInKS,
    "Knowledge swap - Mismatch current knowledge token amount"
  ).is.deep.equal(expectedKnowledgeTokenCurrentAmountInKS);
  expect(
    realUtilityTokenCurrentAmountInKS,
    "Knowledge swap - Mismatch current utility token amount"
  ).is.deep.equal(expectedUtilityTokenCurrentAmountInKS);
  expect(realFeeVaultAmount, "Mismatch fee vault amount").is.deep.equal(
    expectedFeeVaultAmount
  );

  return await calculateFees(provider.connection, tx);
};
