use anchor_lang::prelude::*;

#[event]
pub struct SellFreeTokenEvent {
    pub knowledge_token_mint: Pubkey,
    pub knowledge_token_amount: u64,
    pub requester_utility_token: Pubkey,
    pub utility_token_amount: u64,
    pub trade_fee_amount: u64,
}
