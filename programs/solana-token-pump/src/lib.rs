use anchor_lang::prelude::*;

use instructions::*;
use states::curve::{swap_curve::SwapCurve, swap_fee::SwapFee};

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod states;
pub mod utils;

#[cfg(feature = "devnet")]
declare_id!("GiKGBhyg7fSGrc1sBA9G4qCSr4aZAtrpkYgvBCP96zZM");

#[cfg(not(feature = "devnet"))]
declare_id!("EyvgnsuJ3hGG2TiHaabz7zg2CdX1TPnRmw7M92ZgvfVQ");

#[program]
pub mod solana_token_pump {
    use super::*;

    pub fn init_marketplace(
        ctx: Context<InitializeMarketplace>,
        swap_fee: SwapFee,
        swap_curve: SwapCurve,
    ) -> Result<()> {
        instructions::init_marketplace(ctx, swap_fee, swap_curve)
    }

    pub fn update_marketplace(
        ctx: Context<UpdateMarketplace>,
        knowledge_token_initial_supply_amount: Option<u64>,
        knowledge_token_max_supply_amount: Option<u64>,
        knowledge_token_dex_supply_amount: Option<u64>,
        swap_fee: Option<SwapFee>,
        swap_curve: Option<SwapCurve>,
    ) -> Result<()> {
        instructions::update_marketplace(
            ctx,
            knowledge_token_initial_supply_amount,
            knowledge_token_max_supply_amount,
            knowledge_token_dex_supply_amount,
            swap_fee,
            swap_curve,
        )
    }

    pub fn close_marketplace(ctx: Context<CloseMarketplace>) -> Result<()> {
        instructions::close_marketplace(ctx)
    }

    pub fn deposit_fee(ctx: Context<DepositFee>, amount: u64) -> Result<()> {
        instructions::deposit_fee(ctx, amount)
    }

    pub fn claim_fee(ctx: Context<ClaimFee>, amount: u64) -> Result<()> {
        instructions::claim_fee(ctx, amount)
    }

    pub fn create_token(ctx: Context<CreateToken>, params: CreateTokenParams) -> Result<()> {
        instructions::create_token(ctx, params)
    }

    pub fn create_token_reserves(
        ctx: Context<CreateTokenReserves>,
        params: CreateTokenReservesParams,
    ) -> Result<()> {
        instructions::create_token_reserves(ctx, params)
    }

    pub fn init_swap(ctx: Context<InitSwap>, params: InitSwapParams) -> Result<()> {
        instructions::init_swap(ctx, params)
    }

    pub fn close_swap(ctx: Context<CloseSwap>, is_forced_close: Option<bool>) -> Result<()> {
        instructions::close_swap(ctx, is_forced_close)
    }

    pub fn buy_token(
        ctx: Context<BuyToken>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::buy_token(ctx, amount_in, minimum_amount_out)
    }

    pub fn sell_token(
        ctx: Context<SellToken>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::sell_token(ctx, amount_in, minimum_amount_out)
    }

    pub fn create_token_vesting(
        ctx: Context<CreateTokenVesting>,
        last_claimed_timestamp: i64,
        knowledge_owner: Pubkey,
    ) -> Result<()> {
        instructions::create_token_vesting(ctx, last_claimed_timestamp, knowledge_owner)
    }

    pub fn claim_free_token(ctx: Context<ClaimFreeToken>, claim_amount: u64) -> Result<()> {
        instructions::claim_free_token(ctx, claim_amount)
    }

    pub fn sell_free_token(ctx: Context<SellFreeToken>, sell_amount: u64) -> Result<()> {
        instructions::sell_free_token(ctx, sell_amount)
    }

    pub fn owner_sell_free_token(ctx: Context<OwnerSellFreeToken>, sell_amount: u64) -> Result<()> {
        instructions::owner_sell_free_token(ctx, sell_amount)
    }

    pub fn unlock_token_vesting(
        ctx: Context<UnlockTokenVesting>,
        unlock_amount: Option<u64>,
        unlock_timestamp: Option<i64>,
    ) -> Result<()> {
        instructions::unlock_token_vesting(ctx, unlock_amount, unlock_timestamp)
    }

    pub fn flash_distribute_additional_pair_amount(
        ctx: Context<FlashDistributeAdditionalPairAmount>,
    ) -> Result<()> {
        instructions::flash_distribute_additional_pair_amount(ctx)
    }

    pub fn create_raydium_pool(
        ctx: Context<CreateRaydiumPool>,
        distribute_instruction_index: u8,
        knowledge_token_mint: Pubkey,
    ) -> Result<()> {
        instructions::create_raydium_pool(ctx, distribute_instruction_index, knowledge_token_mint)
    }
}
