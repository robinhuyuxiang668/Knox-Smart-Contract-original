import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { setupTest } from "../utils/setup_test";
import { DEFAULT_MARKET_PLACE_ATTRIBUTE, PRECISION } from "../const";
import { calculateFees, numberToBN } from "../utils/utils";
import { getMarketplaceAddress } from "../utils/pda";
import { TestingConfig } from "../config";

export const runTest = async (
  config: TestingConfig,
  marketplaceOwner: anchor.web3.Keypair
) => {
  const { program, confirmTransaction, provider, newTransaction } =
    await setupTest(marketplaceOwner, config.url);

  program.addEventListener("updateMarketplaceEvent", (event) => {
    console.log("🚀 ~ event:", event);
  });

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);

  const newTradeFee = 1;
  const newTradeFeeType = {
    fixed: {},
  };
  const newCurveType = { exponential: {} };
  const newCurveParams = [
    new anchor.BN(1000),
    new anchor.BN(1200),
    new anchor.BN(1300),
    new anchor.BN(1500),
  ];
  const initialTokenSupply = numberToBN(2_000_000 * PRECISION);
  const maxTokenSupply = numberToBN(20_000_000 * PRECISION);
  const dexTokenSupply = numberToBN(1_840_000 * PRECISION);

  const tx = await newTransaction([
    await program.methods
      .updateMarketplace(
        initialTokenSupply,
        maxTokenSupply,
        dexTokenSupply,
        {
          tradeFee: new anchor.BN(newTradeFee),
          tradeFeeType: newTradeFeeType,
        },
        {
          curveType: newCurveType,
          curveParams: newCurveParams,
        }
      )
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  await calculateFees(provider.connection, tx);

  const marketplace = await program.account.marketplace.fetch(
    marketplaceAddress
  );

  assert.deepEqual(
    marketplace.knowledgeTokenInitialSupplyAmount.toString(),
    initialTokenSupply.toString(),
    "initialKnowledgeTokenSupply mismatch"
  );
  assert.deepEqual(
    marketplace.knowledgeTokenMaxSupplyAmount.toString(),
    maxTokenSupply.toString(),
    "maxKnowledgeTokenSupply mismatch"
  );
  assert.deepEqual(
    marketplace.swapFee.tradeFeeType,
    newTradeFeeType,
    "swapFee.tradeFeeType mismatch"
  );
  assert.strictEqual(
    marketplace.swapFee.tradeFee.toNumber(),
    newTradeFee,
    "swapFee.tradeFee mismatch"
  );
  assert.deepEqual(
    marketplace.swapCurve.curveParams.map((item) => item.toNumber()),
    newCurveParams.map((item) => item.toNumber()),
    "swapCurve.curveParams mismatch"
  );
  assert.deepEqual(
    marketplace.swapCurve.curveType,
    newCurveType,
    "swapCurve.curveType mismatch"
  );

  await confirmTransaction(
    await program.methods
      .updateMarketplace(
        DEFAULT_MARKET_PLACE_ATTRIBUTE.knowledgeTokenInitialSupplyAmount,
        DEFAULT_MARKET_PLACE_ATTRIBUTE.knowledgeTokenMaxSupplyAmount,
        DEFAULT_MARKET_PLACE_ATTRIBUTE.knowledgeTokenDexSupplyAmount,
        DEFAULT_MARKET_PLACE_ATTRIBUTE.swapFee,
        DEFAULT_MARKET_PLACE_ATTRIBUTE.swapCurve
      )
      .rpc()
  );

  return await calculateFees(provider.connection, tx);
};
