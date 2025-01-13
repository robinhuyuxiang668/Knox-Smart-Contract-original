import { describe } from "mocha";

import * as initMarketplace from "../transactions/init_marketplace";
import * as createToken from "../transactions/exponential.create_token";
import * as buyToken from "../transactions/exponential.buy_token";
import * as sellToken from "../transactions/exponential.sell_token";
import * as claimFreeToken from "../transactions/exponential.claim_free_token";
import * as sellFreeToken from "../transactions/exponential.sell_free_token";
import * as unlockInitialSupply from "../transactions/exponential.unlock_initial_supply_token";
import * as createPool from "../transactions/create_raydium_pool";
import * as updateMarketplace from "../transactions/exponential.update_marketplace";
import * as depositFee from "../transactions/deposit_fee";
import * as claimFee from "../transactions/claim_fee";
import * as closeSwap from "../transactions/exponential.close_swap";
import * as closeMarketplace from "../transactions/close_marketplace";
import { getCurrentWallet } from "../utils/utils";
import { DEVNET_CONFIG } from "../config";
// import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";

describe("PLAYGROUND", async () => {
  const MOCKED_TOKEN_METADATA = {
    name: "Test Token 1",
    symbol: "TESTO",
    uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
    hash: "u38iaKy660r5g8LJzCjJh34j2345",
  };

  // it(`Init Marketplace`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   await initMarketplace.runTest(DEVNET_CONFIG, marketplaceOwner);
  // });
  // it(`Update Marketplace`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   await updateMarketplace.runTest(DEVNET_CONFIG, marketplaceOwner);
  // });
  // it(`Deposit Fee`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const feeDepositor = await getCurrentWallet(
  //     "tests/test_accounts/devnet/fee_depositor.json"
  //   );
  //   await depositFee.runTest(DEVNET_CONFIG, feeDepositor, marketplaceOwner);
  // });
  // it(`Claim Fee`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   await claimFee.runTest(DEVNET_CONFIG, marketplaceOwner);
  // });

  // it(`Create Token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const buyer = await getCurrentWallet(
  //     "tests/test_accounts/devnet/buyer.json"
  //   );
  //   await createToken.runTest(
  //     DEVNET_CONFIG,
  //     buyer,
  //     MOCKED_TOKEN_METADATA,
  //     marketplaceOwner
  //   );
  // });
  // it(`Buy Token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const buyer = await getCurrentWallet(
  //     "tests/test_accounts/devnet/buyer.json"
  //   );
  //   await buyToken.runTest(
  //     DEVNET_CONFIG,
  //     buyer,
  //     MOCKED_TOKEN_METADATA,
  //     marketplaceOwner
  //   );
  // });
  // it(`Sell Token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const buyer = await getCurrentWallet(
  //     "tests/test_accounts/devnet/buyer.json"
  //   );
  //   await sellToken.runTest(DEVNET_CONFIG, MOCKED_TOKEN_METADATA, buyer);
  // });
  // it(`Claim Free Token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const buyer = await getCurrentWallet(
  //     "tests/test_accounts/devnet/buyer.json"
  //   );
  //   await claimFreeToken.runTest(
  //     DEVNET_CONFIG,
  //     MOCKED_TOKEN_METADATA,
  //     marketplaceOwner
  //   );
  // });
  // it(`Sell Free Token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const freeTokenSeller = await getCurrentWallet(
  //     "tests/test_accounts/devnet/free_token_seller.json"
  //   );
  //   await sellFreeToken.runTest(
  //     DEVNET_CONFIG,
  //     MOCKED_TOKEN_METADATA,
  //     freeTokenSeller,
  //     false,
  //     marketplaceOwner
  //   );
  // });
  // it(`Unlock initial supply`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const knowledgeOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/knowledge_owner.json"
  //   );
  //   await unlockInitialSupply.runTest(
  //     DEVNET_CONFIG,
  //     MOCKED_TOKEN_METADATA,
  //     knowledgeOwner,
  //     marketplaceOwner
  //   );
  // });
  // it(`Buy all remaining knowledge token`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const buyer = await getCurrentWallet(
  //     "tests/test_accounts/devnet/buyer.json"
  //   );
  //   await buyAllRemainingKnowledgeToken(
  //     DEVNET_CONFIG,
  //     MOCKED_TOKEN_METADATA,
  //     marketplaceOwner,
  //     buyer
  //   );
  // });
  // it(`Create Pool`, async () => {
  //   const poolOperator = await getCurrentWallet(
  //     "tests/test_accounts/devnet/pool_operator.json"
  //   );
  //   await createPool.runTest(
  //     DEVNET_CONFIG,
  //     poolOperator,
  //     MOCKED_TOKEN_METADATA
  //   );
  // });
  // it(`Close Swap`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   const knowledgeOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/knowledge_owner.json"
  //   );
  //   await closeSwap.runTest(
  //     DEVNET_CONFIG,
  //     marketplaceOwner,
  //     MOCKED_TOKEN_METADATA,
  //     knowledgeOwner.publicKey
  //   );
  // });
  // it(`Claim Fee`, async () => {
  //   const marketplaceOwner = await getCurrentWallet(
  //     "tests/test_accounts/devnet/marketplace_owner.json"
  //   );
  //   await closeMarketplace.runTest(DEVNET_CONFIG, marketplaceOwner);
  // });
});
