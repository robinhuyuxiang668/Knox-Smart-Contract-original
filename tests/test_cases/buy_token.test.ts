import { describe } from "mocha";
import { feeLogger } from "../utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { MARKETPLACE_OWNER } from "../const";

import * as createTokenExponential from "../transactions/exponential.create_token";
import * as buyTokenExponential from "../transactions/exponential.buy_token";
import * as closeSwapExponential from "../transactions/exponential.close_swap";
import * as createRaydiumPool from "../transactions/create_raydium_pool";
import { buyAllRemainingKnowledgeToken } from "../transactions/buy_all_remaining_knowledge_token";
import { LOCALNET_CONFIG } from "../config";

describe("BUY TOKEN", async () => {
  it(`Create Token -> Buy Token`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660rIg8LJzCjJh3412345",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Buy Token > 100`, async () => {
    /* Start Setup */
    const BUYER = anchor.web3.Keypair.generate();
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660r5g8LJzCjJh34j2347",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      BUYER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER,
      100
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Buy Token > 1000`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660r4g8LJzCjJh34j2348",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER,
      1000
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Buy Token > 10000`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660r4g8L1zCjJh34j2349",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER,
      10000
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Buy Token > 100000`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660r2g8LJzCjJh34j2350",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER,
      100000
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
  it(`Buy Token > 1000000`, async () => {
    /* Start Setup */
    const MOCKED_TOKEN_METADATA = {
      name: "Test Token 1",
      symbol: "TESTO",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      hash: "u38iaKy660r1g8LJzCjJh34j2351",
    };
    const TRADER = anchor.web3.Keypair.generate();
    const OPERATOR = anchor.web3.Keypair.generate();

    await createTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA
    );
    /* End Setup */

    const fees = await buyTokenExponential.runTest(
      LOCALNET_CONFIG,
      TRADER,
      MOCKED_TOKEN_METADATA,
      MARKETPLACE_OWNER,
      1000000
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

    await closeSwapExponential.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER,
      MOCKED_TOKEN_METADATA,
      null,
      true
    );
    /* End Setup */
  });
});
