use anchor_lang::prelude::*;

#[event]
pub struct BuyTokenEvent {
    pub buyer: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub knowledge_token_amount: u64,
    pub utility_token_amount: u64,
    pub trade_fee: u64,
}
