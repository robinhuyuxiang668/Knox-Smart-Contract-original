use anchor_lang::prelude::*;

#[event]
pub struct UnlockTokenVestingEvent {
    pub knowledge_owner: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub unlock_knowledge_token_amount: u64,
    pub utility_token_amount: u64,
}
