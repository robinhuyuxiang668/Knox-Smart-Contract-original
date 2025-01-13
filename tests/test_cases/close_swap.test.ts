import { describe } from "mocha";
import { MARKETPLACE_OWNER } from "../const";
import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";
import * as anchor from "@coral-xyz/anchor";

import * as buyTokenExponential from "../transactions/exponential.buy_token";
import * as createPool from "../transactions/create_raydium_pool";
import * as closeSwap from "../transactions/exponential.close_swap";
import * as unlockInitialSupplyToken from "../transactions/exponential.unlock_initial_supply_token";

import { feeLogger } from "../utils/utils";
import { LOCALNET_CONFIG } from "../config";

describe("CLOSE SWAP", async () => {
  it("Close Knowledge Swap in case Owner Unlocked All Tokens", async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "12348iaKy660rIg8LJzCjJh34jPfxDuc",
    };
    const EXPONENTIAL_KNOWLEDGE_OWNER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await unlockInitialSupplyToken.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      EXPONENTIAL_KNOWLEDGE_OWNER,
      MARKETPLACE_OWNER
    );

    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createPool.runTest(LOCALNET_CONFIG, OPERATOR, MOCKED_TOKEN_METADATA);
    /* End Setup */

    const fees = await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      EXPONENTIAL_KNOWLEDGE_OWNER.publicKey
    );
    feeLogger(fees);
  });
  it("Close Knowledge Swap By Forced Close", async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "12348iaK3y6rIg8LJzCjJh34jPfxDuc",
    };
    const BUYER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      BUYER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createPool.runTest(LOCALNET_CONFIG, OPERATOR, MOCKED_TOKEN_METADATA);
    /* End Setup */

    const fees = await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    feeLogger(fees);
  });
  it("Close Knowledge Swap partially", async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "12348iaK3y6r238LJzCjJh34jPfxDuc",
    };
    const OPERATOR = anchor.web3.Keypair.generate();
    const EXPONENTIAL_KNOWLEDGE_OWNER = anchor.web3.Keypair.generate();

    await unlockInitialSupplyToken.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      EXPONENTIAL_KNOWLEDGE_OWNER,
      MARKETPLACE_OWNER,
      4
    );

    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createPool.runTest(LOCALNET_CONFIG, OPERATOR, MOCKED_TOKEN_METADATA);
    /* End Setup */

    const fees = await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      EXPONENTIAL_KNOWLEDGE_OWNER.publicKey
    );
    feeLogger(fees);

    /* Start Setup */
    await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      EXPONENTIAL_KNOWLEDGE_OWNER.publicKey,
      true
    );
    /* End Setup */
  });
});
