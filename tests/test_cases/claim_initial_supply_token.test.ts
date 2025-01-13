import { describe } from "mocha";
import { feeLogger } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { MARKETPLACE_OWNER } from "../const";

import * as createTokenExponential from "../transactions/exponential.create_token";
import * as claimInitialSupplyTokenExponential from "../transactions/exponential.claim_initial_supply_token";
import * as closeSwap from "../transactions/exponential.close_swap";
import * as createRaydiumPool from "../transactions/create_raydium_pool";
import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";
import { LOCALNET_CONFIG } from "../config";

describe("CLAIM INITIAL SUPPLY AMOUNT", async () => {
  it(`Create Token -> Claim Initial Token`, async () => {
    /* Start Setup */
    const BUYER = anchor.web3.Keypair.generate();
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660rIg8LJzCjJh34jPfxDu",
    };
    const KNOWLEDGE_OWNER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      BUYER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await claimInitialSupplyTokenExponential.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      KNOWLEDGE_OWNER,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);

    /* Start Setup */
    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createRaydiumPool.runTest(
      LOCALNET_CONFIG,
      OPERATOR,
      MOCKED_TOKEN_METADATA
    );

    await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      KNOWLEDGE_OWNER.publicKey,
      true
    );
    /* End Setup */
  });
  it(`Claim Initial Token`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660rIg8LJzCjJh34jPfxD1",
    };
    const KNOWLEDGE_OWNER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();
    /* End Setup */

    const fees = await claimInitialSupplyTokenExponential.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      KNOWLEDGE_OWNER,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);

    /* Start Setup */
    await buyAllRemainingKnowledgeToken(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );

    await createRaydiumPool.runTest(
      LOCALNET_CONFIG,
      OPERATOR,
      MOCKED_TOKEN_METADATA
    );

    await closeSwap.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      KNOWLEDGE_OWNER.publicKey,
      true
    );
    /* End Setup */
  });
});
