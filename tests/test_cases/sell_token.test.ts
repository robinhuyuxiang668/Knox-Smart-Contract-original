import { describe } from "mocha";
import { feeLogger } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { MARKETPLACE_OWNER } from "../const";

import * as closeSwap from "../transactions/exponential.close_swap";
import * as sellTokenExponential from "../transactions/exponential.sell_token";
import * as buyTokenExponential from "../transactions/exponential.buy_token";
import * as createTokenExponential from "../transactions/exponential.create_token";
import * as createPool from "../transactions/create_raydium_pool";
import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";
import { LOCALNET_CONFIG } from "../config";

describe("SELL TOKEN", async () => {
  it("Sell Token", async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy6601238L123jJh34j2345",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA
    );

    await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER
    );
    /* End Setup */

    const fees = await sellTokenExponential.runTest(
      LOCALNET_CONFIG,
      MOCKED_TOKEN_METADATA,
      TRADER
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
