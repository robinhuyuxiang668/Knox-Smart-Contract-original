use anchor_lang::prelude::*;

use crate::{
    errors::MarketError,
    states::{
        curve::{
            swap_curve::{SwapCurve, SwapDirection},
            swap_fee::SwapFee,
        },
        marketplace::Marketplace,
    },
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum SwapStatus {
    /// Curve is initialized
    Initialized,
    /// Curve is closed
    Closed,
}

#[account]
pub struct Swap {
    pub creator: Pubkey, // the creator of the swap

    pub swap_status: SwapStatus, // swap status

    pub knowledge_token_reserve: Pubkey, // vault account to store the knowledge tokens
    pub knowledge_token_mint: Pubkey,    // mint of the knowledge token
    pub knowledge_token_owner_lock: Pubkey, // reserve account to store owner knowledge token lock
    pub knowledge_token_initial_supply_amount: u64, // the initial amount of the knowledge token that has been minted and locked
    pub knowledge_token_max_supply_amount: u64, // the maximum amount of the knowledge token that can be minted
    pub knowledge_token_current_amount: u64, // the current amount of the knowledge token that has been minted
    pub knowledge_token_dex_supply_amount: u64, // the additional amount to put in raydium pool when the all knowledge tokens sold out
    pub knowledge_token_vesting_created: bool, // Check if token claimed by owner

    pub utility_token_reserve: Pubkey, // vault account to store the utility tokens
    pub utility_token_mint: Pubkey,    // mint of the utility token
    pub utility_token_current_amount: u64, // the current amount of the utility token

    pub swap_fee: SwapFee,     // swap fee config
    pub swap_curve: SwapCurve, // swap curve config

}

impl Swap {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // creator
        + 1                     // swap_status
        + 32                    // knowledge_token_reserve
        + 32                    // knowledge_token_owner_lock
        + 32                    // knowledge_token_mint
        + 8                     // knowledge_token_initial_supply_amount
        + 8                     // knowledge_token_max_supply_amount
        + 8                     // knowledge_token_current_amount
        + 8                     // knowledge_token_additional_amount
        + 32                    // utility_token_reserve
        + 32                    // utility_token_mint
        + 8                     // utility_token_current_amount
        + SwapFee::SIZE         // swap_fee
        + SwapCurve::SIZE       // swap_curve
        + 1                     // created_token_vesting
    ;

    pub fn initialize_supply(
        &mut self,
        marketplace: &Marketplace,
        knowledge_token_owner_lock: Pubkey,
        knowledge_token_reserve: Pubkey,
        knowledge_token_mint: Pubkey,
        utility_token_reserve: Pubkey,
        utility_token_mint: Pubkey,
    ) {
        let curve_calculator = marketplace.swap_curve.get_curve_calculator();
        let knowledge_token_initial_amount = marketplace.knowledge_token_initial_supply_amount;
        let utility_token_initial_amount =
            curve_calculator.calculate_utility_token_amount(knowledge_token_initial_amount);

        self.swap_status = SwapStatus::Initialized;
        self.knowledge_token_reserve = knowledge_token_reserve;
        self.knowledge_token_owner_lock = knowledge_token_owner_lock;
        self.knowledge_token_mint = knowledge_token_mint;
        self.knowledge_token_initial_supply_amount = knowledge_token_initial_amount;
        self.knowledge_token_max_supply_amount = marketplace.knowledge_token_max_supply_amount;
        self.knowledge_token_dex_supply_amount = marketplace.knowledge_token_dex_supply_amount;
        self.knowledge_token_current_amount = knowledge_token_initial_amount;
        self.knowledge_token_vesting_created = false;
        self.utility_token_reserve = utility_token_reserve;
        self.utility_token_mint = utility_token_mint;
        self.utility_token_current_amount = utility_token_initial_amount;
        self.swap_fee = marketplace.swap_fee;
        self.swap_curve = marketplace.swap_curve;
    }

    pub fn is_initialized(&self) -> bool {
        self.swap_status == SwapStatus::Initialized
    }

    pub fn is_closed(&self) -> bool {
        self.swap_status == SwapStatus::Closed
    }

    pub fn close_swap(&mut self) {
        self.swap_status = SwapStatus::Closed;
    }

    pub fn remaining_knowledge_token_amount(&self) -> u64 {
        self.knowledge_token_max_supply_amount
            .checked_sub(self.knowledge_token_current_amount)
            .unwrap()
    }

    pub fn swap(&mut self, input_amount: u64, swap_direction: SwapDirection) -> Result<(u64, u64)> {
        let curve_calculator = self.swap_curve.get_curve_calculator();
        match swap_direction {
            SwapDirection::AtoB => {
                let knowledge_token_amount = curve_calculator.calculate_knowledge_token_return(
                    input_amount,
                    self.utility_token_current_amount,
                    self.knowledge_token_current_amount,
                );
                let trade_fee = self.swap_fee.trading_fee(input_amount);
                self.knowledge_token_current_amount = self
                    .knowledge_token_current_amount
                    .checked_add(knowledge_token_amount)
                    .unwrap();
                if self.knowledge_token_current_amount > self.knowledge_token_max_supply_amount {
                    return err!(MarketError::ExceedMaxKnowledgeTokenAmount);
                }
                self.utility_token_current_amount = self
                    .utility_token_current_amount
                    .checked_add(input_amount)
                    .unwrap();
                Ok((knowledge_token_amount, trade_fee))
            }
            SwapDirection::BtoA => {
                let utility_token_amount = curve_calculator.calculate_utility_token_return(
                    input_amount,
                    self.utility_token_current_amount,
                    self.knowledge_token_current_amount,
                );
                let trade_fee = self.swap_fee.trading_fee(utility_token_amount);
                self.knowledge_token_current_amount = self
                    .knowledge_token_current_amount
                    .checked_sub(input_amount)
                    .unwrap();
                self.utility_token_current_amount = self
                    .utility_token_current_amount
                    .checked_sub(utility_token_amount)
                    .unwrap();
                Ok((
                    utility_token_amount.checked_sub(trade_fee).unwrap(),
                    trade_fee,
                ))
            }
        }
    }
}
