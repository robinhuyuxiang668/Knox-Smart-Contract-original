import { LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import { EXPONENTIAL_FACTOR, PRECISION, PRICE_COEFFICIENT } from "../const";
import {
  createAssociatedTokenAccount,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import {
  calculateFees,
  feeSum,
  numberFromBN,
  numberToBN,
} from "../utils/utils";

import * as createTokenExponential from "./exponential.create_token";
import {
  getFeeVaultAddress,
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getKnowledgeTokenReserveAddress,
  getMarketplaceAddress,
  getUtilityTokenReserveAddress,
} from "../utils/pda";
import { Decimal } from "decimal.js";
import { TestingConfig } from "../config";

function calculateKnowledgeTokenAmountSupply(
  utilityTokenAmount: number,
  exponentFactor: number,
  priceCoefficient: number
) {
  const epr1 = new Decimal(1).div(exponentFactor);
  const epr2 = new Decimal(exponentFactor)
    .mul(new Decimal(utilityTokenAmount).div(PRECISION))
    .div(priceCoefficient)
    .plus(1)
    .ln();

  return epr1.mul(epr2).mul(PRECISION).floor().toNumber();
}

export const runTest = async (
  config: TestingConfig,
  buyer: anchor.web3.Keypair,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  marketplaceOwner: anchor.web3.Keypair,
  buyAmount?: number
) => {
  const {
    program,
    confirmTransaction,
    provider,
    requestAirdrop,
    newTransaction,
  } = await setupTest(buyer, config.url);

  program.addEventListener("buyTokenEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(buyer.publicKey, LAMPORTS_PER_SOL * 10000);
  }

  const [knowledgeTokenMintAddress] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
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
  const [utilityTokenReserveAddress] = getUtilityTokenReserveAddress(
    program.programId,
    knowledgeSwapAddress
  );

  let feesArray: {
    baseFee: number;
    rentFee: number;
    totalFee: number;
  }[] = [];

  const utilityTokenIn = new anchor.BN((buyAmount || 1) * PRECISION);

  const feeVaultTokenAccountBefore = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  let knowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );

  // If the token have not been created -> Create new token
  if (!knowledgeSwap) {
    const createTokenFees = await createTokenExponential.runTest(
      config,
      buyer,
      tokenMetaData
    );
    createTokenFees && feesArray.push(createTokenFees);
  }

  knowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );

  if (!knowledgeSwap) {
    expect(knowledgeSwap, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const knowledgeTokenSupplyBefore = knowledgeSwap?.knowledgeTokenCurrentAmount;

  // Need to create knowledgeToken ATA for buyer if there wasn't
  await createAssociatedTokenAccount(
    provider.connection,
    buyer,
    knowledgeSwap.knowledgeTokenMint,
    buyer.publicKey
  );

  // Need to create utility ATA for buyer if there wasn't
  const buyerUtilityTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    buyer,
    knowledgeSwap.utilityTokenMint,
    buyer.publicKey
  );

  const newUtilityTokenAmount = //wrong name for this variable
    knowledgeSwap.utilityTokenCurrentAmount.add(utilityTokenIn);

  const expectedKnowledgeTokenAmount = numberToBN(
    Math.floor(
      calculateKnowledgeTokenAmountSupply(
        numberFromBN(newUtilityTokenAmount),
        EXPONENTIAL_FACTOR,
        PRICE_COEFFICIENT
      )
    )
  ).sub(knowledgeTokenSupplyBefore);

  const mintAmountOut = expectedKnowledgeTokenAmount.mul(new anchor.BN(0.99));

  const knowledgeTokenReserveBalance = (
    await provider.connection.getTokenAccountBalance(
      knowledgeTokenReserveAddress
    )
  ).value.amount;

  // Prepare enough utility token for buyer before buying
  await confirmTransaction(
    await mintTo(
      provider.connection,
      marketplaceOwner,
      knowledgeSwap.utilityTokenMint,
      buyerUtilityTokenAccount.address,
      marketplaceOwner,
      numberFromBN(utilityTokenIn) + LAMPORTS_PER_SOL
    )
  );

  const utilityAmountInReserveBefore = (
    await getAccount(provider.connection, utilityTokenReserveAddress)
  ).amount;

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction([
    computeBudgetInstruction,
    await program.methods
      .buyToken(utilityTokenIn, mintAmountOut)
      .accounts({
        knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
      })
      .transaction(),
  ]);

  tx.feePayer = buyer.publicKey;
  tx.sign(buyer);

  const signature = await provider.connection.sendRawTransaction(
    tx.serialize()
  );
  await confirmTransaction(signature);

  feesArray.push(await calculateFees(provider.connection, tx));

  const utilityAmountInReserveAfter = (
    await getAccount(provider.connection, utilityTokenReserveAddress)
  ).amount;

  const expectedTradeFee = (() => {
    if (knowledgeSwap.swapFee.tradeFeeType.percentage)
      return knowledgeSwap.swapFee.tradeFee
        .mul(utilityTokenIn)
        .div(new anchor.BN(PRECISION));

    if (knowledgeSwap.swapFee.tradeFeeType.fixed)
      return knowledgeSwap.swapFee.tradeFee;

    return new anchor.BN(0);
  })();

  const feeVaultTokenAccountAfter = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  const realTradeFee = Number(
    feeVaultTokenAccountAfter.amount - feeVaultTokenAccountBefore.amount
  );

  // const confirmedTransaction = await provider.connection.getTransaction(
  //   signature,
  //   {
  //     commitment: "confirmed",
  //     maxSupportedTransactionVersion: 0,
  //   }
  // );
  // console.log(
  //   "🚀 ~ confirmedTransaction:",
  //   confirmedTransaction.meta.logMessages
  // );

  const realKnowledgeTokenAmount = Number(
    (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        buyer,
        knowledgeSwap.knowledgeTokenMint,
        buyer.publicKey
      )
    ).amount
  );

  const expectedKnowledgeTokenReserveRemaining = numberToBN(
    knowledgeTokenReserveBalance
  )
    .sub(expectedKnowledgeTokenAmount)
    .toString();

  const realKnowledgeTokenReserveRemaining = (
    await provider.connection.getTokenAccountBalance(
      knowledgeTokenReserveAddress
    )
  ).value.amount.toString();

  expect(
    realKnowledgeTokenAmount,
    "Mismatch received knowledge token amount"
  ).deep.equal(numberFromBN(expectedKnowledgeTokenAmount));
  expect(
    expectedKnowledgeTokenReserveRemaining,
    "Mismatch remaining knowledge token reserve amount"
  ).is.deep.equal(realKnowledgeTokenReserveRemaining);
  expect(
    utilityAmountInReserveAfter - utilityAmountInReserveBefore,
    "Mismatch utility token reserve amount"
  ).deep.equal(BigInt(utilityTokenIn.toNumber()));
  expect(realTradeFee, "Mismatch trade fee").deep.equal(
    expectedTradeFee.toNumber()
  );

  return feeSum(feesArray);
};
