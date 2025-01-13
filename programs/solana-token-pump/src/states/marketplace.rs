use anchor_lang::prelude::*;

use crate::{
    constants::{
        KNOWLEDGE_TOKEN_DEX_SUPPLY, KNOWLEDGE_TOKEN_INITIAL_SUPPLY, KNOWLEDGE_TOKEN_MAX_SUPPLY,
    },
    states::curve::{swap_curve::SwapCurve, swap_fee::SwapFee},
};

#[account]
pub struct Marketplace {
    pub marketplace_owner: Pubkey,                  // market owner
    pub utility_token_mint: Pubkey,                 // mint of the utility token
    pub fee_vault: Pubkey, // vault account to store the fees, also used to cover free tokens
    pub knowledge_token_initial_supply_amount: u64, // the initial supply of the knowledge token
    pub knowledge_token_max_supply_amount: u64, // the maximum supply of the knowledge token
    pub knowledge_token_dex_supply_amount: u64, // the additional amount to put in raydium pool when the all knowledge tokens sold out
    pub swap_fee: SwapFee,                      // the default fee config for the marketplace
    pub swap_curve: SwapCurve,                  // the default curve config for the marketplace
    pub swap_count: u64,                        // the number of opening swaps in the marketplace
    pub closed: u8,                             // whether the marketplace is closed
}

impl Marketplace {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // owner
        + 32                    // utility_token_mint
        + 32                    // fee_vault
        + 8                     // knowledge_token_initial_supply_amount
        + 8                     // knowledge_token_max_supply_amount
        + 8                     // knowledge_token_additional_amount
        + SwapFee::SIZE         // swap_fee
        + SwapCurve::SIZE       // swap_curve
        + 8                     // swap_count
        + 1                     // closed
    ;

    pub fn initialize(
        &mut self,
        marketplace_owner: Pubkey,
        utility_token_mint: Pubkey,
        fee_vault: Pubkey,
        swap_fee: SwapFee,
        swap_curve: SwapCurve,
    ) {
        self.marketplace_owner = marketplace_owner;
        self.utility_token_mint = utility_token_mint;
        self.fee_vault = fee_vault;
        self.knowledge_token_initial_supply_amount = KNOWLEDGE_TOKEN_INITIAL_SUPPLY;
        self.knowledge_token_max_supply_amount = KNOWLEDGE_TOKEN_MAX_SUPPLY;
        self.knowledge_token_dex_supply_amount = KNOWLEDGE_TOKEN_DEX_SUPPLY;
        self.swap_fee = swap_fee;
        self.swap_curve = swap_curve;
        self.swap_count = 0;
        self.closed = 0;
    }

    pub fn has_open_swaps(&self) -> bool {
        self.swap_count > 0
    }

    pub fn is_closed(&self) -> bool {
        self.closed == 1
    }

    pub fn close_market(&mut self) {
        self.closed = 1;
    }
}
