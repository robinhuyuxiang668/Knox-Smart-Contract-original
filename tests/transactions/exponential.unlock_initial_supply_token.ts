import { LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import {
  EXPONENTIAL_FACTOR,
  KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME,
  KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE,
  PRICE_COEFFICIENT,
} from "../const";
import { expect } from "chai";
import {
  calculateFees,
  calculateUtilityTokenAmount,
  daysToMillisecond,
  feeSum,
  numberFromBN,
} from "../utils/utils";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as createTokenExponential from "./exponential.create_token";
import * as claimInitialSupplyToken from "./exponential.claim_initial_supply_token";
import {
  getFeeVaultAddress,
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getMarketplaceAddress,
  getTokenVestingAddress,
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
  knowledgeOwner: anchor.web3.Keypair,
  marketplaceOwner: anchor.web3.Keypair,
  unlockPeriod?: number
) => {
  const {
    program,
    provider,
    requestAirdrop,
    confirmTransaction,
    newTransaction,
  } = await setupTest(knowledgeOwner, config.url);

  program.addEventListener("unlockTokenVestingEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(knowledgeOwner.publicKey, LAMPORTS_PER_SOL * 10);
  }

  let percentToUnlock = 0;
  let partialUnlockIndexes = [2, 3];
  let feesArray: {
    baseFee: number;
    rentFee: number;
    totalFee: number;
  }[] = [];

  for (
    let index = 0;
    index < (unlockPeriod || KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE.length);
    index++
  ) {
    const dayDiff = KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME[index] + 1;
    if (index !== 3)
      percentToUnlock += KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE[index];

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

    knowledgeSwap = await program.account.swap.fetchNullable(
      knowledgeSwapAddress
    );

    const [tokenVestingAddress] = await getTokenVestingAddress(
      program.programId,
      knowledgeOwner.publicKey,
      knowledgeSwap.knowledgeTokenMint
    );

    let tokenVesting = await program.account.tokenVesting.fetchNullable(
      tokenVestingAddress
    );

    // If the initial supply have not been created -> Claim initial supply
    if (!tokenVesting) {
      const fees = await await claimInitialSupplyToken.runTest(
        config,
        tokenMetaData,
        knowledgeOwner,
        marketplaceOwner
      );

      fees && feesArray.push(fees);
    }

    tokenVesting = await program.account.tokenVesting.fetchNullable(
      tokenVestingAddress
    );

    const lastUnlockKnowledgeTokenAmount =
      tokenVesting.unlockedKnowledgeTokenAmount;

    const lastFeeVaultAmount = (
      await getAccount(provider.connection, feeVaultAddress)
    ).amount;

    const now = new Date();
    const mockedUnlockDate = new anchor.BN(
      new Date(now.getTime() + daysToMillisecond(dayDiff)).getTime() / 1000
    );

    const ownerUtilityTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      knowledgeOwner,
      knowledgeSwap.utilityTokenMint,
      knowledgeOwner.publicKey
    );

    if (index === 0) {
      await confirmTransaction(
        await mintTo(
          provider.connection,
          marketplaceOwner,
          knowledgeSwap.utilityTokenMint,
          ownerUtilityTokenAccount.address,
          marketplaceOwner,
          1000 * LAMPORTS_PER_SOL
        )
      );
    }

    // Create knowledge token ATA for owner
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      knowledgeOwner,
      knowledgeSwap.knowledgeTokenMint,
      knowledgeOwner.publicKey
    );

    const expectedTotalAmountToUnlock =
      knowledgeSwap.knowledgeTokenInitialSupplyAmount
        .mul(new anchor.BN(percentToUnlock))
        .div(new anchor.BN(100));

    const lasUnlockedAmount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        knowledgeOwner,
        knowledgeSwap.knowledgeTokenMint,
        knowledgeOwner.publicKey
      )
    ).amount;

    const expectedAmountToUnlock = expectedTotalAmountToUnlock
      .sub(new anchor.BN(Number(lasUnlockedAmount)))
      .div(new anchor.BN(partialUnlockIndexes.includes(index) ? 2 : 1));

    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300_000,
    });

    const tx = await newTransaction([
      computeBudgetInstruction,
      await program.methods
        .unlockTokenVesting(
          // If the index eq 2 or 3, a half of unlockable amount
          partialUnlockIndexes.includes(index) ? expectedAmountToUnlock : null,
          mockedUnlockDate
        )
        .accounts({
          knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
        })
        .transaction(),
    ]);

    tx.feePayer = knowledgeOwner.publicKey;
    tx.sign(knowledgeOwner);

    const signature = await provider.connection.sendRawTransaction(
      tx.serialize()
    );

    await confirmTransaction(signature);

    // const confirmedTransaction = await provider.connection.getTransaction(
    //   signature,
    //   {
    //     commitment: "confirmed",
    //     maxSupportedTransactionVersion: 0,
    //   }
    // );
    // console.log("🚀 ~ confirmedTransaction:", confirmedTransaction)

    const realUnlockedAmount =
      (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          knowledgeOwner,
          knowledgeSwap.knowledgeTokenMint,
          knowledgeOwner.publicKey
        )
      ).amount - lasUnlockedAmount;
    const newUnlockKnowledgeTokenAmount = (
      await program.account.tokenVesting.fetchNullable(tokenVestingAddress)
    ).unlockedKnowledgeTokenAmount;

    const expectedRequiredUtilityToken =
      Math.floor(
        calculateUtilityTokenAmount(
          numberFromBN(newUnlockKnowledgeTokenAmount),
          EXPONENTIAL_FACTOR,
          PRICE_COEFFICIENT
        )
      ) -
      Math.floor(
        calculateUtilityTokenAmount(
          numberFromBN(lastUnlockKnowledgeTokenAmount),
          EXPONENTIAL_FACTOR,
          PRICE_COEFFICIENT
        )
      );

    const newFeeVaultAmount = (
      await getAccount(provider.connection, feeVaultAddress)
    ).amount;

    const actualRequiredUtilityTokenAmount =
      newFeeVaultAmount - lastFeeVaultAmount;

    expect(
      Number(realUnlockedAmount).toString(),
      "Mismatch unlock amount"
    ).is.deep.equal(expectedAmountToUnlock.toString());
    expect(
      Number(actualRequiredUtilityTokenAmount),
      "Mismatch required utility token amount"
    ).is.deep.equal(expectedRequiredUtilityToken);
  }

  return feeSum(feesArray);
};
