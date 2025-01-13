import { readFile } from "fs/promises";
import path from "path";
import * as anchor from "@coral-xyz/anchor";
import { PRECISION } from "../const";
import {
  LAMPORTS_PER_SOL,
  Transaction,
  Connection,
  Keypair,
} from "@solana/web3.js";

export const numberFromBN = (bigNum: anchor.BN) => {
  /// Use this functions to transfer from numbers that bigger than 2^53 - 1 to BN
  return Number(bigNum.toString());
};

/// Use this functions to transfer from BN numbers that bigger than 2^53 - 1 to `number`
export const numberToBN = (num: number | string | bigint) =>
  new anchor.BN(num.toString());

export const daysToMillisecond = (days: number) => {
  return days * 24 * 60 * 60 * 1000;
};

export function calculateUtilityTokenAmount(
  knowledgeTokenAmount: number,
  exponentFactor: number,
  priceCoefficient: number
) {
  return (
    (priceCoefficient / exponentFactor) *
    (Math.exp(exponentFactor * (knowledgeTokenAmount / PRECISION)) - 1) *
    PRECISION
  );
}

export async function calculateFees(
  connection: Connection,
  transaction: Transaction,
  accountSize?: number,
  showLog: boolean = true
) {
  const rentExempt = await connection.getMinimumBalanceForRentExemption(
    accountSize || 0
  );
  const baseFee =
    (await connection.getFeeForMessage(transaction.compileMessage())).value ||
    0;

  const rentFee = rentExempt;
  const totalFee = baseFee + rentFee;

  const fees = {
    baseFee,
    rentFee,
    totalFee,
  };

  return fees;
}

export function feeLogger({
  baseFee,
  rentFee,
  totalFee,
}: {
  baseFee: number;
  rentFee: number;
  totalFee: number;
}) {
  console.log(`Base fee: ${baseFee} Lamports`);
  console.log(`Rent fee: ${rentFee} Lamports`);
  console.log(
    `Total transaction fee: ${totalFee} lamports (${
      totalFee / LAMPORTS_PER_SOL
    } SOL)`
  );
}

export function feeSum(
  feesArr: {
    baseFee: number;
    rentFee: number;
    totalFee: number;
  }[]
) {
  return feesArr.reduce(
    (prev, current) => ({
      baseFee: prev.baseFee + current.baseFee,
      rentFee: prev.rentFee + current.rentFee,
      totalFee: prev.totalFee + current.totalFee,
    }),
    {
      baseFee: 0,
      rentFee: 0,
      totalFee: 0,
    }
  );
}

export async function transactionLog(
  connection: anchor.web3.Connection,
  signature: string
) {
  const confirmedTransaction = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  console.log("Logs: ", confirmedTransaction.meta.logMessages);
}

export const getCurrentWalletKeyPair = async (filepath?: string) => {
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

export const getCurrentWallet = async (filepath?: string) => {
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
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fileContents)));
};
