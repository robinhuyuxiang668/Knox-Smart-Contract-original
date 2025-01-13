import { expect } from "chai";
import { setupTest } from "../utils/setup_test";
import { calculateFees, numberFromBN, numberToBN } from "../utils/utils";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getMarketplaceAddress,
  getTokenVestingAddress,
} from "../utils/pda";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  marketplaceOwner: Keypair,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  knowledgeOwner: PublicKey | null,
  isForcedClose: boolean = false
) => {
  const { program, confirmTransaction, provider, newTransaction } =
    await setupTest(marketplaceOwner, config.url);

  program.addEventListener("closeSwapEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  const isOwnerExisted = !!knowledgeOwner;

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);
  const [knowledgeTokenMintAddress] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
  );
  const [tokenVestingAddress] = isOwnerExisted
    ? getTokenVestingAddress(
        program.programId,
        knowledgeOwner,
        knowledgeTokenMintAddress
      )
    : [null];

  const marketplaceBefore = await program.account.marketplace.fetch(
    marketplaceAddress
  );

  const swapCountBefore = marketplaceBefore.swapCount;

  const knowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );
  const tokenVesting = isOwnerExisted
    ? await program.account.tokenVesting.fetchNullable(tokenVestingAddress)
    : null;

  const marketplaceOwnerUtilityATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    marketplaceOwner,
    knowledgeSwap.utilityTokenMint,
    marketplaceOwner.publicKey
  );
  const marketplaceOwnerKnowledgeATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    marketplaceOwner,
    knowledgeSwap.knowledgeTokenMint,
    marketplaceOwner.publicKey
  );

  const tx = await newTransaction([
    await program.methods
      .closeSwap(isForcedClose)
      .accounts({
        knowledgeTokenMint: knowledgeTokenMintAddress,
        tokenVesting: tokenVestingAddress,
      })
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  const signature = await provider.connection.sendRawTransaction(
    tx.serialize()
  );

  const knowledgeReserveBalanceBefore = (
    await provider.connection.getTokenAccountBalance(
      knowledgeSwap.knowledgeTokenReserve
    )
  ).value.amount;

  const utilityReserveBalanceBefore = (
    await provider.connection.getTokenAccountBalance(
      knowledgeSwap.utilityTokenReserve
    )
  ).value.amount;
  const marketplaceOwnerUtilityBalanceBefore =
    marketplaceOwnerUtilityATA.amount;
  const marketplaceOwnerKnowledgeBalanceBefore =
    marketplaceOwnerKnowledgeATA.amount;

  const ownerLockingAmountBefore = (
    await provider.connection.getTokenAccountBalance(
      knowledgeSwap.knowledgeTokenOwnerLock
    )
  ).value.amount;

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const marketplaceAfter = await program.account.marketplace.fetch(
    marketplaceAddress
  );

  const swapCountAfter = marketplaceAfter.swapCount;

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

  const closedKnowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );
  const closedTokenVesting = isOwnerExisted
    ? await program.account.tokenVesting.fetchNullable(tokenVestingAddress)
    : null;

  let closedUtilityTokenReserve = false;
  let closedKnowledgeTokenReserve = false;
  let closedKnowledgeOwnerLock = false;

  try {
    await getAccount(provider.connection, knowledgeSwap.utilityTokenReserve);
  } catch (error) {
    if (error?.name === "TokenAccountNotFoundError") {
      closedUtilityTokenReserve = true;
    }
  }

  try {
    await getAccount(provider.connection, knowledgeSwap.knowledgeTokenReserve);
  } catch (error) {
    if (error?.name === "TokenAccountNotFoundError") {
      closedKnowledgeTokenReserve = true;
    }
  }

  try {
    await getAccount(
      provider.connection,
      knowledgeSwap.knowledgeTokenOwnerLock
    );
  } catch (error) {
    if (error?.name === "TokenAccountNotFoundError") {
      closedKnowledgeOwnerLock = true;
    }
  }

  const unlockedAllToken =
    isOwnerExisted &&
    numberFromBN(tokenVesting.lockingKnowledgeTokenAmount) === 0;
  const canCloseLocking = isForcedClose || unlockedAllToken;

  if (isForcedClose) {
    const expectedMarketplaceUtilityAmount = numberFromBN(
      numberToBN(marketplaceOwnerUtilityBalanceBefore).add(
        numberToBN(utilityReserveBalanceBefore)
      )
    );

    const actualMarketplaceOwnerUtilityAmount = numberFromBN(
      numberToBN(
        (
          await provider.connection.getTokenAccountBalance(
            marketplaceOwnerUtilityATA.address
          )
        ).value.amount
      )
    );

    expect(
      actualMarketplaceOwnerUtilityAmount,
      "Force Close - Marketplace owner received wrong utility amount"
    ).deep.equal(expectedMarketplaceUtilityAmount);
  }

  if (canCloseLocking) {
    const expectedMarketplaceOwnerKnowledgeAmount = (
      Number(marketplaceOwnerKnowledgeBalanceBefore) +
      Number(knowledgeReserveBalanceBefore) +
      Number(ownerLockingAmountBefore)
    ).toString();
    const actualMarketplaceOwnerKnowledgeAmount = (
      await provider.connection.getTokenAccountBalance(
        marketplaceOwnerKnowledgeATA.address
      )
    ).value.amount;

    expect(
      closedUtilityTokenReserve,
      "Utility Token Reserve have not been closed"
    ).true;
    expect(
      closedKnowledgeTokenReserve,
      "Knowledge Token Reserve have not been closed"
    ).is.true;
    expect(closedTokenVesting, "Token Vesting have not been closed").is.null;
    isOwnerExisted &&
      expect(
        closedKnowledgeOwnerLock,
        "Knowledge Owner Lock have not been closed"
      ).is.true;
    expect(closedKnowledgeSwap, "Knowledge Swap have not been closed").is.null;
    expect(swapCountAfter.toNumber(), "Swap count mismatch").deep.eq(
      swapCountBefore.toNumber() - 1
    );
    expect(
      actualMarketplaceOwnerKnowledgeAmount,
      "Force Close - Marketplace owner received wrong knowledge amount"
    ).deep.equal(expectedMarketplaceOwnerKnowledgeAmount);
  }

  return await calculateFees(provider.connection, tx);
};
