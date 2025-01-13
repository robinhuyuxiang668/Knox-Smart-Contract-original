use anchor_lang::prelude::*;

#[event]
pub struct ClaimFeeEvent {
    pub claim_fee_destination: Pubkey,
    pub amount: u64,
}
