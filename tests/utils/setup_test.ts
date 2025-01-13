import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
} from "@solana/web3.js";
import { SolanaTokenPump } from "../../target/types/solana_token_pump";
import idl from "../../target/idl/solana_token_pump.json";
import path from "path";
import { readFile } from "fs/promises";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

export const setupTest = (walletKeyPair: anchor.web3.Keypair, url?: string) => {
  const connection = new Connection(
    url || "http://127.0.0.1:8899",
    "confirmed"
  );
  const customWallet = new anchor.Wallet(walletKeyPair);
  const customProvider = new anchor.AnchorProvider(connection, customWallet, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(customProvider);

  const program = new Program(idl as SolanaTokenPump, customProvider);
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const umi = createUmi(provider.connection).use(mplTokenMetadata());

  const requestAirdrop = async (
    address: PublicKey,
    lamports: number = LAMPORTS_PER_SOL
  ) => {
    let latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      signature: await provider.connection.requestAirdrop(address, lamports),
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });
  };

  const confirmTransaction = async (txSignature: string) => {
    let latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });
  };

  const getCurrentWalletKeyPair = async (filepath?: string) => {
    if (!filepath) {
      // Default value from Solana CLI
      filepath = "~/.config/solana/id.json";
    }
    if (filepath[0] === "~") {
      const home = process.env.HOME || null;
      if (home) {
        filepath = path.join(home, filepath.slice(1));
      }
    }

    const fileContents = (await readFile(filepath)).toString();
    return anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fileContents))
    );
  };

  const newTransaction = async (
    instructions: (
      | anchor.web3.Transaction
      | anchor.web3.TransactionInstruction
      | anchor.web3.TransactionInstructionCtorFields
    )[]
  ) => {
    let latestBlockHash = await provider.connection.getLatestBlockhash();

    const tx = new Transaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    for (let index = 0; index < instructions.length; index++) {
      const instruction = instructions[index];

      tx.add(instruction);
    }

    return tx;
  };

  return {
    program,
    provider,
    requestAirdrop,
    confirmTransaction,
    getCurrentWalletKeyPair,
    umi,
    newTransaction,
  };
};
