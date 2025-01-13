import { ComputeBudgetProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { setupTest } from "../utils/setup_test";
import {
  findMetadataPda,
  safeFetchMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";
import { expect } from "chai";
import {
  calculateFees,
  calculateUtilityTokenAmount,
  numberFromBN,
} from "../utils/utils";
import {
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getMarketplaceAddress,
} from "../utils/pda";
import {
  EXPONENTIAL_FACTOR,
  MARKETPLACE_OWNER,
  PRECISION,
  PRICE_COEFFICIENT,
} from "../const";
import { createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  buyer: anchor.web3.Keypair,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  }
) => {
  const {
    program,
    confirmTransaction,
    requestAirdrop,
    umi,
    provider,
    newTransaction,
  } = await setupTest(buyer, config.url);

  program.addEventListener("createTokenEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });
  program.addEventListener("initSwapEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(buyer.publicKey);
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

  const marketplace = await program.account.marketplace.fetchNullable(
    marketplaceAddress
  );

  // Create Utility ATA for swap buyer if needed
  const buyerUtilityTokenAccount = await createAssociatedTokenAccount(
    provider.connection,
    buyer,
    marketplace.utilityTokenMint,
    buyer.publicKey
  );

  // Prepare enough utility token for init knowledge swap
  await confirmTransaction(
    await mintTo(
      provider.connection,
      MARKETPLACE_OWNER,
      marketplace.utilityTokenMint,
      buyerUtilityTokenAccount,
      MARKETPLACE_OWNER,
      100 * PRECISION
    )
  );

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction([
    computeBudgetInstruction,
    await program.methods.createToken(tokenMetaData).transaction(),
    await program.methods
      .createTokenReserves({ hash: tokenMetaData.hash })
      .accounts({
        utilityTokenMint: marketplace.utilityTokenMint,
      })
      .transaction(),
    await program.methods
      .initSwap({
        hash: tokenMetaData.hash,
      })
      .transaction(),
  ]);

  tx.feePayer = buyer.publicKey;
  tx.sign(buyer);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const knowledgeSwapAccountInfo = await provider.connection.getAccountInfo(
    knowledgeSwapAddress
  );

  const metadataPDA = findMetadataPda(umi, {
    mint: fromWeb3JsPublicKey(knowledgeTokenMintAddress),
  });

  const metadataAccount = await safeFetchMetadata(umi, metadataPDA);

  const knowledgeSwap = await program.account.swap.fetchNullable(
    knowledgeSwapAddress
  );

  const realKnowledgeTokenReserveAmount = (
    await provider.connection.getTokenAccountBalance(
      knowledgeSwap.knowledgeTokenReserve
    )
  ).value.amount.toString();

  const initialUtilityTokenReserveAmount = calculateUtilityTokenAmount(
    numberFromBN(marketplace.knowledgeTokenInitialSupplyAmount),
    EXPONENTIAL_FACTOR,
    PRICE_COEFFICIENT
  );

  const defaultUtilityTokenInReserve = calculateUtilityTokenAmount(
    numberFromBN(marketplace.knowledgeTokenInitialSupplyAmount),
    EXPONENTIAL_FACTOR,
    PRICE_COEFFICIENT
  );

  const expectedKnowledgeTokenReserveAmount =
    marketplace.knowledgeTokenMaxSupplyAmount
      .sub(marketplace.knowledgeTokenInitialSupplyAmount)
      .toString();

  const expectedSuppliedKnowledgeTokenAmount =
    marketplace.knowledgeTokenInitialSupplyAmount.toString();

  const expectedSwapCurrentUtilityAmount =
    initialUtilityTokenReserveAmount.toFixed(0);

  const realUtilityTokenReserveAmount = (
    await provider.connection.getTokenAccountBalance(
      knowledgeSwap.utilityTokenReserve
    )
  ).value.amount;
  const expectedUtilityTokenReserveAmount = (
    Math.floor(initialUtilityTokenReserveAmount) -
    Math.floor(defaultUtilityTokenInReserve)
  ).toString();

  if (!metadataAccount) {
    expect(metadataAccount, "Metadata not found").not.null;
    return;
  }
  if (!knowledgeSwap) {
    expect(knowledgeSwap, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  expect(metadataAccount.name, "Mismatch token name").deep.eq(
    tokenMetaData.name
  );
  expect(metadataAccount.symbol, "Mismatch token symbol").deep.eq(
    tokenMetaData.symbol
  );
  expect(metadataAccount.uri, "Mismatch token uri").deep.eq(tokenMetaData.uri);
  expect(
    toWeb3JsPublicKey(metadataAccount.mint),
    "Mismatch mint address"
  ).deep.eq(knowledgeTokenMintAddress);
  expect(
    knowledgeSwap.knowledgeTokenCurrentAmount.toString(),
    "Swap - Knowledge Swap Mismatch initial supply"
  ).deep.equal(expectedSuppliedKnowledgeTokenAmount);
  expect(
    knowledgeSwap.knowledgeTokenMaxSupplyAmount.toString(),
    "Swap - Mismatch initial supply"
  ).deep.equal(marketplace.knowledgeTokenMaxSupplyAmount.toString());
  expect(
    knowledgeSwap.knowledgeTokenMint,
    "Swap - Knowledge Token Mint not found"
  ).is.not.null;
  expect(knowledgeSwap.swapCurve, "Swap - Mismatch Swap Curve").deep.equal(
    marketplace.swapCurve
  );
  expect(knowledgeSwap.swapFee, "Swap - Mismatch Swap Fee").deep.equal(
    marketplace.swapFee
  );
  expect(
    knowledgeSwap.swapStatus,
    "Swap - Status should be Initialized"
  ).deep.equal({
    initialized: {},
  });
  expect(
    knowledgeSwap.utilityTokenMint,
    "Swap - Mismatch utility token mint"
  ).deep.equal(marketplace.utilityTokenMint);
  expect(
    knowledgeSwap.utilityTokenReserve,
    "Swap - Utility Token Reserve not found"
  ).is.not.null;
  expect(
    knowledgeSwap.knowledgeTokenReserve,
    "Swap - Knowledge Token Reserve not found"
  ).is.not.null;
  expect(
    realKnowledgeTokenReserveAmount,
    "Swap - Mismatch knowledge reserve amount"
  ).deep.equal(expectedKnowledgeTokenReserveAmount);
  expect(
    knowledgeSwap.utilityTokenCurrentAmount.toString(),
    "Swap - Unexpected initial utility token amount"
  ).equal(expectedSwapCurrentUtilityAmount.toString());
  expect(
    realUtilityTokenReserveAmount,
    "Current utility token amount in reserve"
  ).deep.equal(expectedUtilityTokenReserveAmount);

  return await calculateFees(
    provider.connection,
    tx,
    knowledgeSwapAccountInfo?.data.byteLength
  );
};
