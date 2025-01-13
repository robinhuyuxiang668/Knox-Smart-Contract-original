pub const PRECISION: u32 = 10_u32.pow(KNOWLEDGE_TOKEN_DEFAULT_DECIMALS as u32); // 9 decimal places, 100%

// Constants for knowledge tokens
pub const KNOWLEDGE_TOKEN_DEFAULT_DECIMALS: u8 = 9; // 9 decimal places, temporary for testing
pub const KNOWLEDGE_TOKEN_DEX_SUPPLY: u64 =
    920_000 * 10_u64.pow(KNOWLEDGE_TOKEN_DEFAULT_DECIMALS as u32); // 10m knowledge tokens
pub const KNOWLEDGE_TOKEN_MAX_SUPPLY: u64 =
    10_000_000 * 10_u64.pow(KNOWLEDGE_TOKEN_DEFAULT_DECIMALS as u32); // 10m knowledge tokens
pub const KNOWLEDGE_TOKEN_INITIAL_SUPPLY: u64 =
    1_000_000 * 10_u64.pow(KNOWLEDGE_TOKEN_DEFAULT_DECIMALS as u32); // 1m knowledge tokens
pub const KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME: [u16; 12] = [
    30,  // 30 days
    60,  // 60 days
    90,  // 90 days
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
pub const KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE: [u32; 12] = [
    1 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 1%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
    9 * 10_u32.pow((KNOWLEDGE_TOKEN_DEFAULT_DECIMALS - 2) as u32), // 9%
];

// Constants for swap curve
pub const SWAP_CURVE_PARAMETER_DECIMALS: u8 = 22; // 22 decimal places
pub const SWAP_CURVE_PRECISION: u128 = 10_u128.pow(SWAP_CURVE_PARAMETER_DECIMALS as u32); // 22 decimal places, 100%

pub const IS_TESTING: bool = cfg!(feature = "devnet") || cfg!(feature = "localnet");
