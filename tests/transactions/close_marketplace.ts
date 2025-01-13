import { expect } from "chai";
import { setupTest } from "../utils/setup_test";
import { calculateFees } from "../utils/utils";
import { getMarketplaceAddress } from "../utils/pda";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { TestingConfig } from "../config";
import { Keypair } from "@solana/web3.js";

export const runTest = async (
  config: TestingConfig,
  marketplaceOwner: Keypair
) => {
  const { program, confirmTransaction, provider, newTransaction } =
    await setupTest(marketplaceOwner, config.url);

  const [marketplaceAddress] = getMarketplaceAddress(program.programId);

  const marketplace = await program.account.marketplace.fetchNullable(
    marketplaceAddress
  );

  const marketplaceOwnerUtilityATA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    marketplaceOwner,
    marketplace.utilityTokenMint,
    marketplaceOwner.publicKey
  );

  const tx = await newTransaction([
    await program.methods
      .closeMarketplace()
      .accounts({
        claimFeeDestination: marketplaceOwnerUtilityATA.address,
      })
      .transaction(),
  ]);

  tx.feePayer = marketplaceOwner.publicKey;
  tx.sign(marketplaceOwner);

  await confirmTransaction(
    await provider.connection.sendRawTransaction(tx.serialize())
  );

  const closedMarketplace = await program.account.marketplace.fetchNullable(
    marketplaceAddress
  );

  expect(closedMarketplace, "Marketplace is not closed").null;

  return await calculateFees(provider.connection, tx);
};
