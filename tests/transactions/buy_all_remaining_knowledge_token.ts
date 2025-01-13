import { EXPONENTIAL_FACTOR, PRICE_COEFFICIENT } from "../const";
import { setupTest } from "../utils/setup_test";
import { LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  calculateUtilityTokenAmount,
  numberFromBN,
  numberToBN,
} from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import {
  getFeeVaultAddress,
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getMarketplaceAddress,
} from "../utils/pda";
import { expect } from "chai";
import { TestingConfig } from "../config";

export async function buyAllRemainingKnowledgeToken(
  config: TestingConfig,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  },
  marketplaceOwner: anchor.web3.Keypair,
  trader?: anchor.web3.Keypair
) {
  const internalTrader = trader || new anchor.web3.Keypair();

  const {
    program,
    requestAirdrop,
    confirmTransaction,
    provider,
    newTransaction,
  } = await setupTest(internalTrader, config.url);

  if (config.name === "LOCAL") {
    await requestAirdrop(internalTrader.publicKey, LAMPORTS_PER_SOL * 10000);
    await requestAirdrop(marketplaceOwner.publicKey, LAMPORTS_PER_SOL * 10000);
  }

  const [knowledgeTokenMintAddress] = await getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = await getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
  );
  const [marketplaceAddress] = await getMarketplaceAddress(program.programId);
  const [feeVaultAddress] = await getFeeVaultAddress(
    program.programId,
    marketplaceAddress
  );

  const knowledgeSwap = await program.account.swap.fetch(knowledgeSwapAddress);

  if (!knowledgeSwap) {
    expect(knowledgeSwap, "Knowledge Swap Not Found").is.not.null;
    return;
  }

  const remainingKnowledgeTokenAmount =
    knowledgeSwap.knowledgeTokenMaxSupplyAmount.sub(
      knowledgeSwap.knowledgeTokenCurrentAmount
    );

  const utilityTokenForMaxSupply = calculateUtilityTokenAmount(
    numberFromBN(knowledgeSwap.knowledgeTokenMaxSupplyAmount),
    EXPONENTIAL_FACTOR,
    PRICE_COEFFICIENT
  );

  const utilityTokenForCurrentSupply = calculateUtilityTokenAmount(
    numberFromBN(knowledgeSwap.knowledgeTokenCurrentAmount),
    EXPONENTIAL_FACTOR,
    PRICE_COEFFICIENT
  );

  const utilityTokenIn = numberToBN(
    utilityTokenForMaxSupply - utilityTokenForCurrentSupply
  );

  // Create Knowledge Token ATA for trader
  await getOrCreateAssociatedTokenAccount(
    provider.connection,
    internalTrader,
    knowledgeSwap.knowledgeTokenMint,
    internalTrader.publicKey
  );

  // Create Utility Token ATA for trader
  const buyerUtilityTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    internalTrader,
    knowledgeSwap.utilityTokenMint,
    internalTrader.publicKey
  );

  await confirmTransaction(
    await mintTo(
      provider.connection,
      marketplaceOwner,
      knowledgeSwap.utilityTokenMint,
      buyerUtilityTokenAccount.address,
      marketplaceOwner,
      LAMPORTS_PER_SOL * 100000000
    )
  );

  const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 300_000,
  });

  const tx = await newTransaction([
    computeBudgetInstruction,
    await program.methods
      .buyToken(
        utilityTokenIn,
        remainingKnowledgeTokenAmount.mul(new anchor.BN(0.99))
      )
      .accounts({
        knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
      })
      .transaction(),
  ]);

  tx.feePayer = internalTrader.publicKey;
  tx.sign(internalTrader);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const utilityAmountInReserve = numberToBN(
    (await getAccount(provider.connection, knowledgeSwap.utilityTokenReserve))
      .amount
  );
  const utilityInSwap = (await program.account.swap.fetch(knowledgeSwapAddress))
    .knowledgeTokenCurrentAmount;
  const missingRemainingUtilityTokenAmount = utilityInSwap.sub(
    utilityAmountInReserve
  );

  await confirmTransaction(
    await mintTo(
      provider.connection,
      marketplaceOwner,
      knowledgeSwap.utilityTokenMint,
      feeVaultAddress,
      marketplaceOwner,
      numberFromBN(missingRemainingUtilityTokenAmount)
    )
  );
}
