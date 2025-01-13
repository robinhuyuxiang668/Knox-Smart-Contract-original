use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Marketplace not owned by the given account")]
    MarketplaceNotOwnedByAccount,

    #[msg("Marketplace already closed")]
    MarketplaceAlreadyClosed,

    #[msg("Invalid claim fee amount")]
    InvalidFeeAmount,

    #[msg("Invalid fee account")]
    InvalidFeeAccount,

    #[msg("Invalid utility token mint")]
    InvalidUtilityTokenMint,

    #[msg("Invalid claim fee account")]
    InvalidClaimFeeAccount,

    #[msg("Invalid deposit fee account")]
    InvalidDepositFeeAccount,

    #[msg("Market has unclaimed fee")]
    MarketHasUnclaimedFee,

    #[msg("Market has open swaps")]
    MarketHasOpenSwaps,

    #[msg("Swap must not be initialized")]
    SwapMustNotBeInitialized,

    #[msg("Swap must be initialized")]
    SwapMustBeInitialized,

    #[msg("Swap must be closed")]
    SwapMustBeClosed,

    #[msg("Swap creator mismatch")]
    SwapCreatorMismatch,

    #[msg("Exceed max knowledge token amount")]
    ExceedMaxKnowledgeTokenAmount,

    #[msg("Exceed slippage")]
    ExceededSlippage,

    #[msg("Invalid claim amount")]
    InvalidClaimAmount,

    #[msg("Invalid user account")]
    UserMismatch,

    #[msg("No amount available to unlock")]
    NoAmountToUnlock,

    #[msg("Invalid claimed initial supply date time")]
    InvalidClaimedDateTime,

    #[msg("Claimed date time is after current timestamp")]
    ClaimedDateTimeIsAfterCurrentTime,

    #[msg("Invalid unlock knowledge token amount")]
    InvalidUnlockAmount,

    #[msg("Invalid swap")]
    InvalidSwap,
    
    #[msg("Knowledge token lock not locked by the given account")]
    KnowledgeTokenLockNotLockedByAccount,

    #[msg("Knowledge swap already closed")]
    KnowledgeSwapAlreadyClosed,

    #[msg("Invalid knowledge token mint")]
    InvalidKnowledgeTokenMint,

    #[msg("Invalid sell amount")]
    InvalidSellAmount,

    #[msg("Invalid buy amount")]
    InvalidBuyAmount,

    #[msg("Invalid input unlock amount")]
    InvalidInputUnlockAmount,

    #[msg("Invalid shared data")]
    InvalidSharedData,

    #[msg("Flash Repay was called via CPI!")]
    CreateRaydiumPoolCpi,
    
    #[msg("Instruction Index does not match")]
    InvalidInstructionIndexCreateRaydiumPool,

    #[msg("Invalid operator account")]
    InvalidRaydiumPoolOperator,

    #[msg("Invalid knowledge token mint")]
    InvalidRaydiumPoolKnowledgeTokenMint,

    #[msg("Invalid knowledge swap")]
    InvalidRaydiumPoolKnowledgeSwap,
    
    #[msg("Invalid knowledge token operator")]
    InvalidRaydiumPoolKnowledgeOperator,

    #[msg("Invalid utility token operator")]
    InvalidRaydiumPoolUtilityOperator,
    
    #[msg("distribute_additional_pair_amount instruction index for create_raydium_pool doesn't match")]
    InvalidDistributeAdditionalPairAmount,
    
    #[msg("No create_raydium_pool Instruction found")]
    NoCreateRaydiumPoolFound,
    
    #[msg("Multiple distribute additional not allowed")]
    MultipleDistributeAdditionalPairAmount,

    #[msg("Multiple create pool not allowed")]
    MultipleCreateRaydiumPool,

    #[msg("Distribute Additional was called via CPI!")]
    DistributeAdditionalPairAmountCpi,

    #[msg("create_raydium_pool: Supplied distribute_additional_pair_amount instruction index is not a distribute_additional_pair_amount")]
    DistributeAdditionalPairAmountCpiMismatchIndex,

    #[msg("Insufficient utility amount for creating pool!")]
    InsufficientUtilityAmountForCreatingPool,

    #[msg("Knowledge token reserve must be empty!")]
    KnowledgeReserveMustBeEmpty,

    #[msg("Utility token reserve must be empty!")]
    UtilityReserveMustBeEmpty,

    #[msg("Token vesting must be existed!")]
    TokenVestingMustBeExisted,

    #[msg("Token vesting must not be existed!")]
    TokenVestingMustNotBeExisted,
}
