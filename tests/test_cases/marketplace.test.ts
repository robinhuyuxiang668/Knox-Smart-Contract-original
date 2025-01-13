import { describe } from "mocha";
import * as claimFee from "../transactions/claim_fee";
import * as depositFee from "../transactions/deposit_fee";
import * as initMarketplace from "../transactions/init_marketplace";
import * as updateMarketplaceExponential from "../transactions/exponential.update_marketplace";
import * as anchor from "@coral-xyz/anchor";

import { MARKETPLACE_OWNER } from "../const";
import { feeLogger } from "../utils/utils";
import { LOCALNET_CONFIG } from "../config";

describe("MARKET PLACE OPEN", async () => {
  it("Can Init Marketplace", async () => {
    const fees = await initMarketplace.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);
  });
  // it("Can Update Marketplace", async () => {
  //   const fees = await updateMarketplaceExponential.runTest(
  //     LOCALNET_CONFIG,
  //     MARKETPLACE_OWNER
  //   );
  //   feeLogger(fees);
  // });
  // it("Can Deposit Fee", async () => {
  //   const DEPOSITOR = anchor.web3.Keypair.generate();

  //   const fees = await depositFee.runTest(
  //     LOCALNET_CONFIG,
  //     DEPOSITOR,
  //     MARKETPLACE_OWNER
  //   );
  //   feeLogger(fees);
  // });
  // it("Can Claim Fee", async () => {
  //   const fees = await claimFee.runTest(LOCALNET_CONFIG, MARKETPLACE_OWNER);
  //   feeLogger(fees);
  // });
});
