import { ComputeBudgetProgram } from "@solana/web3.js";
import { setupTest } from "../utils/setup_test";
import * as anchor from "@coral-xyz/anchor";
import { EXPONENTIAL_FACTOR, PRECISION, PRICE_COEFFICIENT } from "../const";
import { expect } from "chai";
import {
  calculateFees,
  calculateUtilityTokenAmount,
  numberFromBN,
} from "../utils/utils";
import { getAccount } from "@solana/spl-token";
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
  needClaim: boolean,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const { program, confirmTransaction, provider, newTransaction } =
    await setupTest(marketplaceOwner, config.url);

  program.addEventListener("ownerSellFreeTokenEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

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
  const [utilityTokenReserveAddress] = getUtilityTokenReserveAddress(
    program.programId,
    knowledgeSwapAddress
  );

  const knowledgeSwap = await program.account.swap.fetch(knowledgeSwapAddress);

  const feeVaultTokenAccountBefore = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  const claimKnowledgeTokenAmount = new anchor.BN(PRECISION);
  const sellKnowledgeTokenAmount = new anchor.BN(PRECISION);

  const utilityAmountInReserveBefore = Number(
    (await getAccount(provider.connection, utilityTokenReserveAddress)).amount
  );

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction(
    [
      computeBudgetInstruction,
      needClaim &&
        (await program.methods
          .claimFreeToken(sellKnowledgeTokenAmount)
          .accounts({
            knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
          })
          .transaction()),
      await program.methods
        .ownerSellFreeToken(sellKnowledgeTokenAmount)
        .accounts({
          knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
        })
        .transaction(),
    ].filter((item) => item) as anchor.web3.Transaction[]
  );

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  const signature = await provider.connection.sendRawTransaction(
    tx.serialize()
  );

  await confirmTransaction(signature);

  const feeVaultTokenAccountAfter = await getAccount(
    provider.connection,
    feeVaultAddress
  );

  const differentialUtilityAmountForSellAmount =
    numberFromBN(knowledgeSwap.utilityTokenCurrentAmount) -
    Math.floor(
      calculateUtilityTokenAmount(
        numberFromBN(
          knowledgeSwap.knowledgeTokenCurrentAmount.sub(
            sellKnowledgeTokenAmount
          )
        ),
        EXPONENTIAL_FACTOR,
        PRICE_COEFFICIENT
      )
    );

  const sellFreeTokenFee =
    Math.floor(
      (knowledgeSwap.swapFee.tradeFee.toNumber() *
        differentialUtilityAmountForSellAmount) /
        PRECISION
    ) || 1;

  const utilityAmountInReserveAfter = Number(
    (await getAccount(provider.connection, utilityTokenReserveAddress)).amount
  );

  const knowledgeSwapAfter = await program.account.swap.fetch(
    knowledgeSwapAddress
  );

  if (needClaim) {
    const differentialUtilityAmountForClaimedAmount =
      Math.floor(
        calculateUtilityTokenAmount(
          numberFromBN(
            knowledgeSwap.knowledgeTokenCurrentAmount.add(
              claimKnowledgeTokenAmount
            )
          ),
          EXPONENTIAL_FACTOR,
          PRICE_COEFFICIENT
        )
      ) - numberFromBN(knowledgeSwap.utilityTokenCurrentAmount);

    const realPoolKnowledgeTokenAmount = numberFromBN(
      knowledgeSwapAfter.knowledgeTokenCurrentAmount
    );
    const expectedPoolKnowledgeTokenAmount = numberFromBN(
      knowledgeSwap.knowledgeTokenCurrentAmount
        .add(claimKnowledgeTokenAmount)
        .sub(sellKnowledgeTokenAmount)
    );

    const actualPoolUtilityTokenAmount = numberFromBN(
      knowledgeSwapAfter.utilityTokenCurrentAmount
    );
    const expectedPoolUtilityTokenAmount = numberFromBN(
      knowledgeSwap.utilityTokenCurrentAmount
    );

    const realUtilityTokenReserveAmount = utilityAmountInReserveAfter;
    const expectedUtilityTokenReserveAmount = utilityAmountInReserveBefore;

    const actualFeeVaultAmount = Number(feeVaultTokenAccountAfter.amount);
    const expectedFeeVaultAmount = Number(feeVaultTokenAccountBefore.amount);

    expect(
      realPoolKnowledgeTokenAmount,
      "Knowledge Swap - Remaining knowledge token amount"
    ).equal(expectedPoolKnowledgeTokenAmount);
    expect(
      actualPoolUtilityTokenAmount,
      "Knowledge Swap - Pool utility token amount"
    ).equal(expectedPoolUtilityTokenAmount);
    expect(
      realUtilityTokenReserveAmount,
      "Mismatch utility token in reserve"
    ).deep.equal(expectedUtilityTokenReserveAmount);
    expect(actualFeeVaultAmount, "Mismatch fee vault amount").deep.equal(
      expectedFeeVaultAmount
    );
  } else {
    const differentialUtilityAmountForSellAmount =
      numberFromBN(knowledgeSwap.utilityTokenCurrentAmount) -
      Math.floor(
        calculateUtilityTokenAmount(
          numberFromBN(
            knowledgeSwap.knowledgeTokenCurrentAmount.sub(
              sellKnowledgeTokenAmount
            )
          ),
          EXPONENTIAL_FACTOR,
          PRICE_COEFFICIENT
        )
      );

    const actualPoolKnowledgeTokenAmount = numberFromBN(
      knowledgeSwapAfter.knowledgeTokenCurrentAmount
    );
    const expectedPoolKnowledgeTokenAmount = numberFromBN(
      knowledgeSwap.knowledgeTokenCurrentAmount.sub(sellKnowledgeTokenAmount)
    );

    const actualPoolUtilityTokenAmount = numberFromBN(
      knowledgeSwapAfter.utilityTokenCurrentAmount
    );
    const expectedPoolUtilityTokenAmount = numberFromBN(
      knowledgeSwap.utilityTokenCurrentAmount.sub(
        new anchor.BN(differentialUtilityAmountForSellAmount)
      )
    );

    const actualUtilityTokenReserveAmount = utilityAmountInReserveAfter;
    const expectedUtilityTokenReserveAmount =
      utilityAmountInReserveBefore - differentialUtilityAmountForSellAmount;

    const actualFeeVaultAmount = Number(feeVaultTokenAccountAfter.amount);
    const expectedFeeVaultAmount =
      Number(feeVaultTokenAccountBefore.amount) +
      differentialUtilityAmountForSellAmount;

    expect(
      actualPoolKnowledgeTokenAmount,
      "Knowledge Swap - Remaining knowledge token amount"
    ).equal(expectedPoolKnowledgeTokenAmount);
    expect(
      actualPoolUtilityTokenAmount,
      "Knowledge Swap - Pool utility token amount"
    ).equal(expectedPoolUtilityTokenAmount);
    expect(
      actualUtilityTokenReserveAmount,
      "Mismatch utility token in reserve"
    ).deep.equal(expectedUtilityTokenReserveAmount);
    expect(actualFeeVaultAmount, "Mismatch fee vault amount").deep.equal(
      expectedFeeVaultAmount
    );
  }

  return await calculateFees(provider.connection, tx);
};
