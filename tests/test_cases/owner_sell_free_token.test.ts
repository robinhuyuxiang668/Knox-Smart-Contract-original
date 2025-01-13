import { describe } from "mocha";
import { feeLogger } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { MARKETPLACE_OWNER } from "../const";

import * as closeSwap from "../transactions/exponential.close_swap";
import * as createTokenExponential from "../transactions/exponential.create_token";
import * as claimFreeToken from "../transactions/exponential.claim_free_token";
import * as ownerSellFreeToken from "../transactions/exponential.owner_sell_free_token";
import * as createPool from "../transactions/create_raydium_pool";
import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";
import { LOCALNET_CONFIG } from "../config";

describe("OWNER SELL FREE TOKEN", async () => {
  it(`Owner Sell Free Token`, async () => {
    /* Start Setup */
    const BUYER = anchor.web3.Keypair.generate();
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaK32y64542344JzCjJh34j2346",
    };
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      BUYER,
      MOCKED_TOKEN_METADATA
    );

    await claimFreeToken.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );
    /* End Setup */

    const fees = await ownerSellFreeToken.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      false,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);

    /* Start Setup */
    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createPool.runTest(LOCALNET_CONFIG, OPERATOR, MOCKED_TOKEN_METADATA);

    await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Claimed Free Token > Owner Sell Free Token`, async () => {
    /* Start Setup */
    const BUYER = anchor.web3.Keypair.generate();
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy645434232344JzCjJh34j2346",
    };
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      BUYER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await ownerSellFreeToken.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      true,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);

    /* Start Setup */
    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createPool.runTest(LOCALNET_CONFIG, OPERATOR, MOCKED_TOKEN_METADATA);

    await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
});
