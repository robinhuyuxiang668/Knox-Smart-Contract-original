import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { calculateFees, feeSum } from "../utils/utils";
import {
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getTokenVestingAddress,
} from "../utils/pda";

import * as createTokenExponential from "./exponential.create_token";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  knowledgeOwner: anchor.web3.Keypair,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const {
    program,
    provider,
    requestAirdrop,
    confirmTransaction,
    newTransaction,
  } = await setupTest(marketplaceOwner, config.url);

  program.addEventListener("createTokenVestingEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(knowledgeOwner.publicKey);
  }

  let feesArray: {
    baseFee: number;
    rentFee: number;
    totalFee: number;
  }[] = [];

  const [knowledgeTokenMintAddress] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
  );

  let knowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );

  // If the token have not been created -> Create new token
  if (!knowledgeSwap) {
    const createTokenFees = await createTokenExponential.runTest(
      config,
      knowledgeOwner,
      tokenMetaData
    );
    createTokenFees && feesArray.push(createTokenFees);
  }

  knowledgeSwap = await program.account.swap.fetch(knowledgeSwapAddress);

  if (!knowledgeSwap) {
    expect(knowledgeSwap, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const lastClaimAt = new Date();

  lastClaimAt.setDate(lastClaimAt.getDate() - 1);

  const lastClaimAtMilliseconds = new anchor.BN(lastClaimAt.getTime() / 1000);

  const transaction = await newTransaction([
    await program.methods
      .createTokenVesting(lastClaimAtMilliseconds, knowledgeOwner.publicKey)
      .accounts({
        knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
      })
      .transaction(),
  ]);

  transaction.feePayer = marketplaceOwner.publicKey;
  transaction.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(transaction.serialize())
  );

  const [tokenVestingAddress] = await getTokenVestingAddress(
    program.programId,
    knowledgeOwner.publicKey,
    knowledgeSwap.knowledgeTokenMint
  );

  const tokenVestingAccountInfo = await provider.connection.getAccountInfo(
    tokenVestingAddress
  );

  if (!tokenVestingAccountInfo) {
    expect(tokenVestingAccountInfo, "Owner Locking Token Not Found").is.not
      .null;
    return;
  }

  feesArray.push(
    await calculateFees(
      provider.connection,
      transaction,
      tokenVestingAccountInfo.data.byteLength
    )
  );

  const tokenVesting = await program.account.tokenVesting.fetch(
    tokenVestingAddress
  );

  expect(tokenVesting.knowledgeOwner, "Mismatch locker").is.deep.equal(
    knowledgeOwner.publicKey
  );
  expect(
    tokenVesting.knowledgeTokenMint,
    "Mismatch knowledge token mint"
  ).is.deep.equal(knowledgeSwap.knowledgeTokenMint);
  expect(
    tokenVesting.lockingKnowledgeTokenAmount.toNumber(),
    "Mismatch locking knowledge token amount"
  ).is.deep.equal(knowledgeSwap.knowledgeTokenInitialSupplyAmount.toNumber());
  expect(
    tokenVesting.unlockedKnowledgeTokenAmount.toNumber(),
    "Mismatch unlocked Knowledge Token Amount"
  ).is.deep.equal(0);
  expect(
    tokenVesting.lastClaimedAt.toNumber(),
    "Invalid last claimed time"
  ).is.lessThan(lastClaimAt.getTime());
  expect(
    tokenVesting.lastUnlockedAt.toNumber(),
    "Invalid last unlock time"
  ).is.eq(0);

  return feeSum(feesArray);
};
