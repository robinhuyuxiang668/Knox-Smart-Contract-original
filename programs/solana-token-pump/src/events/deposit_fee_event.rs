use anchor_lang::prelude::*;

#[event]
pub struct DepositFeeEvent {
    pub depositor: Pubkey,
    pub amount: u64,
}
