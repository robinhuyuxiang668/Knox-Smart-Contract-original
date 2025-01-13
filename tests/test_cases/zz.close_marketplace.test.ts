import { describe } from "mocha";
import { LOCALNET_CONFIG } from "../config";
import { MARKETPLACE_OWNER } from "../const";
import * as closeMarketplace from "../transactions/close_marketplace";

import { feeLogger } from "../utils/utils";

describe("CLOSE MARKET PLACE", async () => {
  it("Can Close Marketplace", async () => {
    const fees = await closeMarketplace.runTest(
      LOCALNET_CONFIG,
      MARKETPLACE_OWNER
    );
    feeLogger(fees);
  });
});
