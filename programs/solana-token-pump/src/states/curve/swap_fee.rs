use anchor_lang::prelude::*;

use crate::constants::PRECISION;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum FeeType {
    /// Fixed fee
    Fixed,
    /// Percentage fee
    Percentage,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct SwapFee {
    pub trade_fee: u64,
    pub trade_fee_type: FeeType,
}

impl SwapFee {
    pub const SIZE: usize = 0
        + 8                     // trade_fee
        + 1                     // trade_fee_type
    ;

    pub fn trading_fee(&self, trading_token_amount: u64) -> u64 {
        match self.trade_fee_type {
            FeeType::Fixed => self.trade_fee,
            FeeType::Percentage => {
                let fee = (trading_token_amount as u128)
                    .checked_mul(self.trade_fee as u128).unwrap()
                    .checked_div(PRECISION as u128).unwrap() as u64;

                if fee == 0 {
                    1 // minimum fee of one token
                } else {
                    fee
                }
            }
        }
    }
}
