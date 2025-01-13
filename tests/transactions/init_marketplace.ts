import { DEFAULT_MARKET_PLACE_ATTRIBUTE } from "../const";
import { getMarketplaceAddress } from "../utils/pda";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";
import { setupTest } from "../utils/setup_test";
import { calculateFees } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { createMint } from "@solana/spl-token";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const {
    program,
    requestAirdrop,
    provider,
    confirmTransaction,
    newTransaction,
  } = await setupTest(marketplaceOwner, config.url);

  if (config.name === "LOCAL") {
    await requestAirdrop(marketplaceOwner.publicKey, 10 * LAMPORTS_PER_SOL);
  }

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);

  // Utility Mint Creation
  let mint = await createMint(
    provider.connection,
    marketplaceOwner,
    marketplaceOwner.publicKey,
    marketplaceOwner.publicKey,
    9
  );

  const tx = await newTransaction([
    await program.methods
      .initMarketplace(
        DEFAULT_MARKET_PLACE_ATTRIBUTE.swapFee,
        DEFAULT_MARKET_PLACE_ATTRIBUTE.swapCurve
      )
      .accounts({
        utilityTokenMint: mint,
      })
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const marketplace = await program.account.marketplace.fetchNullable(
    marketplaceAddress
  );

  assert.strictEqual(
    marketplace.marketplaceOwner.toString(),
    marketplaceOwner.publicKey.toString(),
    "Owner mismatch"
  );
  assert.strictEqual(
    marketplace.utilityTokenMint.toBase58(),
    mint.toBase58(),
    "Mint mismatch"
  );
  assert.strictEqual(
    marketplace.closed,
    0,
    "Marketplace should be open by default"
  );
  assert.deepEqual(
    marketplace.swapFee.tradeFeeType,
    DEFAULT_MARKET_PLACE_ATTRIBUTE.swapFee.tradeFeeType,
    "swapFee.tradeFeeType mismatch"
  );
  assert.strictEqual(
    marketplace.swapFee.tradeFee.toNumber(),
    DEFAULT_MARKET_PLACE_ATTRIBUTE.swapFee.tradeFee.toNumber(),
    "swapFee.tradeFee mismatch"
  );
  assert.deepEqual(
    marketplace.swapCurve.curveParams.map((item) => item.toString()),
    DEFAULT_MARKET_PLACE_ATTRIBUTE.swapCurve.curveParams.map((item) =>
      item.toString()
    ),
    "swapCurve.curveParams mismatch"
  );
  assert.deepEqual(
    marketplace.swapCurve.curveType,
    DEFAULT_MARKET_PLACE_ATTRIBUTE.swapCurve.curveType,
    "swapCurve.curveType mismatch"
  );
  assert.deepEqual(
    marketplace.knowledgeTokenInitialSupplyAmount.toString(),
    DEFAULT_MARKET_PLACE_ATTRIBUTE.knowledgeTokenInitialSupplyAmount.toString(),
    "swapCurve.curveType mismatch"
  );
  assert.deepEqual(
    marketplace.knowledgeTokenMaxSupplyAmount.toString(),
    DEFAULT_MARKET_PLACE_ATTRIBUTE.knowledgeTokenMaxSupplyAmount.toString(),
    "swapCurve.curveType mismatch"
  );

  const marketplaceAccountInfo = await provider.connection.getAccountInfo(
    marketplaceAddress
  );

  return await calculateFees(
    provider.connection,
    tx,
    marketplaceAccountInfo.data.length
  );
};
