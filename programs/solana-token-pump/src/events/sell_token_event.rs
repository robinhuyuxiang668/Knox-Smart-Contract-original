use anchor_lang::prelude::*;

#[event]
pub struct SellTokenEvent {
    pub seller: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub knowledge_token_amount: u64,
    pub utility_token_amount: u64,
    pub trade_fee_amount: u64,
}
