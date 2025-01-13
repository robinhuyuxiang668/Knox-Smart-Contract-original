import * as anchor from "@coral-xyz/anchor";

// Curve parameter
export const SWAP_CURVE_PARAMETER_DECIMALS = 22;

export const KNOWLEDGE_TOKEN_DEFAULT_DECIMALS = 9;

export const PRICE_COEFFICIENT = 0.00035938136638046275;

export const PRECISION = Math.pow(10, KNOWLEDGE_TOKEN_DEFAULT_DECIMALS);

export const PRICE_COEFFICIENT_WITH_DECIMALS =
  PRICE_COEFFICIENT * Math.pow(10, SWAP_CURVE_PARAMETER_DECIMALS);

export const EXPONENTIAL_FACTOR = 0.0000010233711524417982;

export const EXPONENTIAL_FACTOR_WITH_DECIMALS =
  EXPONENTIAL_FACTOR * Math.pow(10, SWAP_CURVE_PARAMETER_DECIMALS);

// Marketplace params
export const UTILITY_TOKEN_POOLED_AMOUNT = 50000 * PRECISION; //Simulate you have 50,000 utility token in the pool but actually there is no pool, just a simulation number for calculation
export const KNOWLEDGE_TOKEN_POOLED_AMOUNT = 100000 * PRECISION; //Simulate you have 100,000 knowledge token in the pool but actually there is no pool, just a simulation number for calculation
export const KNOWLEDGE_TOKEN_ADDITIONAL_AMOUNT = 920_000 * PRECISION;

export const DEFAULT_MARKET_PLACE_ATTRIBUTE = {
  knowledgeTokenInitialSupplyAmount: new anchor.BN(
    (1_000_000 * PRECISION).toString()
  ),
  knowledgeTokenMaxSupplyAmount: new anchor.BN(
    (10_000_000 * PRECISION).toString()
  ),
  knowledgeTokenDexSupplyAmount: new anchor.BN(
    KNOWLEDGE_TOKEN_ADDITIONAL_AMOUNT.toString()
  ),
  knowledgeTokenFreeClaimAmount: new anchor.BN((0.5 * PRECISION).toString()),
  knowledgeTokenMaxFreeClaimAmount: new anchor.BN((10 * PRECISION).toString()),
  swapFee: {
    tradeFee: new anchor.BN(1),
    tradeFeeType: {
      percentage: {},
    },
  },
  swapCurve: {
    curveType: { exponential: {} },
    curveParams: [
      new anchor.BN(PRICE_COEFFICIENT_WITH_DECIMALS.toString()),
      new anchor.BN(EXPONENTIAL_FACTOR_WITH_DECIMALS.toString()),
      new anchor.BN(1300),
      new anchor.BN(1500),
    ],
  },
};

export const CONSTANT_CURVE_MARKET_PLACE_ATTRIBUTE = {
  knowledgeTokenInitialSupplyAmount: new anchor.BN(
    (1_000 * PRECISION).toString()
  ),
  knowledgeTokenMaxSupplyAmount: new anchor.BN((10_000 * PRECISION).toString()),
  knowledgeTokenFreeClaimAmount: new anchor.BN((0.5 * PRECISION).toString()),
  knowledgeTokenMaxFreeClaimAmount: new anchor.BN((10 * PRECISION).toString()),
  swapFee: {
    tradeFee: new anchor.BN(1),
    tradeFeeType: {
      percentage: {},
    },
  },
  swapCurve: {
    curveType: { constantProduct: {} },
    curveParams: [
      new anchor.BN(UTILITY_TOKEN_POOLED_AMOUNT.toString()),
      new anchor.BN(KNOWLEDGE_TOKEN_POOLED_AMOUNT.toString()),
      new anchor.BN(0),
      new anchor.BN(0),
    ],
  },
};

// Keypair
export const MARKETPLACE_OWNER = anchor.web3.Keypair.generate();

// Owner Locking
export const KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME = [
  30, // 30 days
  60, // 60 days
  // 90 days period will be divided into 2 unlocking
  90, // 90 days
  90, // 90 days
  120, // 120 days
  150, // 150 days
  180, // 180 days
  210, // 210 days
  240, // 240 days
  270, // 270 days
  300, // 300 days
  330, // 330 days
  360, // 360 days
];

export const KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE = [
  1, // 1%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
  9, // 9%
];
