use anchor_lang::prelude::*;

#[event]
pub struct ClaimFreeTokenEvent {
    pub knowledge_token_mint: Pubkey,
    pub claim_amount: u64,
    pub required_utility_token_amount: u64,
}
