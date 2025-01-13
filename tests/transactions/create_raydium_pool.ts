import { setupTest } from "../utils/setup_test";
import { KNOWLEDGE_TOKEN_ADDITIONAL_AMOUNT } from "../const";
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getKnowledgeSwapAddress,
  getKnowledgeTokenMintAddress,
  getRaydiumPoolAddress,
  getRaydiumPoolLpMintAddress,
} from "../utils/pda";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { CpmmPoolInfoLayout } from "@raydium-io/raydium-sdk-v2";
import { expect } from "chai";
import { calculateFees, numberFromBN } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  operator: anchor.web3.Keypair,
  tokenMetaData: {
    name: string;
    symbol: string;
    uri: string;
    hash: string;
  }
) => {
  const {
    program,
    requestAirdrop,
    confirmTransaction,
    provider,
    newTransaction,
  } = await setupTest(operator, config.url);

  program.addEventListener("createRaydiumPoolEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  if (config.name === "LOCAL") {
    await requestAirdrop(operator.publicKey);
  }

  const [knowledgeTokenMintAddress] = getKnowledgeTokenMintAddress(
    program.programId,
    tokenMetaData.hash
  );
  const [knowledgeSwapAddress] = getKnowledgeSwapAddress(
    program.programId,
    knowledgeTokenMintAddress
  );

  const knowledgeSwap = await program.account.swap.fetch(knowledgeSwapAddress);
  const finalUtilityTokenAmount = knowledgeSwap.utilityTokenCurrentAmount;

  const isToken0KnowledgeToken =
    knowledgeSwap.knowledgeTokenMint.toString() <
    knowledgeSwap.utilityTokenMint.toString();

  const token0Mint = isToken0KnowledgeToken
    ? knowledgeSwap.knowledgeTokenMint
    : knowledgeSwap.utilityTokenMint;
  const token1Mint = !isToken0KnowledgeToken
    ? knowledgeSwap.knowledgeTokenMint
    : knowledgeSwap.utilityTokenMint;

  const [poolAddress] = getRaydiumPoolAddress(
    config.raydiumAmmConfig,
    token0Mint,
    token1Mint,
    config.cmmppProgram
  );
  const [lpMintAddress] = await getRaydiumPoolLpMintAddress(
    poolAddress,
    config.cmmppProgram
  );
  const [operatorLpTokenAddress] = await PublicKey.findProgramAddressSync(
    [
      operator.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      lpMintAddress.toBuffer(),
    ],
    ASSOCIATED_PROGRAM_ID
  );

  const operatorKnowledgeToken = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      operator,
      knowledgeSwap.knowledgeTokenMint,
      operator.publicKey,
      false
    )
  ).address;
  const operatorUtilityToken = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      operator,
      knowledgeSwap.utilityTokenMint,
      operator.publicKey,
      false
    )
  ).address;

  const pairInfo = isToken0KnowledgeToken
    ? {
        token0Mint: knowledgeSwap.knowledgeTokenMint,
        token1Mint: knowledgeSwap.utilityTokenMint,
        operatorToken0: operatorKnowledgeToken,
        operatorToken1: operatorUtilityToken,
        token0Program: TOKEN_PROGRAM_ID,
        token1Program: TOKEN_PROGRAM_ID,
      }
    : {
        token0Mint: knowledgeSwap.utilityTokenMint,
        token1Mint: knowledgeSwap.knowledgeTokenMint,
        operatorToken0: operatorUtilityToken,
        operatorToken1: operatorKnowledgeToken,
        token0Program: TOKEN_PROGRAM_ID,
        token1Program: TOKEN_PROGRAM_ID,
      };

  const distributeTx = await program.methods
    .flashDistributeAdditionalPairAmount()
    .accounts({
      knowledgeTokenMint: knowledgeSwap.knowledgeTokenMint,
    })
    .transaction();

  const createTx = await program.methods
    .createRaydiumPool(0, knowledgeSwap.knowledgeTokenMint)
    .accounts({
      ...pairInfo,
      raydiumAmmConfig: config.raydiumAmmConfig,
      operatorLpToken: operatorLpTokenAddress,
    })
    .transaction();

  const tx = await newTransaction([distributeTx, createTx]);

  tx.feePayer = operator.publicKey;

  tx.sign(operator);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  await calculateFees(provider.connection, tx);

  const accountInfo = await program.provider.connection.getAccountInfo(
    poolAddress
  );
  const poolState = CpmmPoolInfoLayout.decode(accountInfo.data);

  let vault0 = await getAccount(
    provider.connection,
    poolState.vaultA,
    "processed",
    poolState.mintProgramA
  );

  let vault1 = await getAccount(
    provider.connection,
    poolState.vaultB,
    "processed",
    poolState.mintProgramB
  );

  expect(vault0.amount.toString()).deep.equal(
    vault0.amount.toString(),
    (isToken0KnowledgeToken
      ? KNOWLEDGE_TOKEN_ADDITIONAL_AMOUNT
      : numberFromBN(finalUtilityTokenAmount)
    ).toString()
  );
  expect(vault1.amount.toString()).deep.equal(
    vault1.amount.toString(),
    (!isToken0KnowledgeToken
      ? KNOWLEDGE_TOKEN_ADDITIONAL_AMOUNT
      : numberFromBN(finalUtilityTokenAmount)
    ).toString()
  );
  expect(accountInfo, "The Pool have not been created yet").not.null;

  return await calculateFees(provider.connection, tx);
};
