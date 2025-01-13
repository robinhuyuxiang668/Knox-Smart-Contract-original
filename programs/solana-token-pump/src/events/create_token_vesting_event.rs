use anchor_lang::prelude::*;

#[event]
pub struct CreateTokenVestingEvent {
    pub knowledge_token_mint: Pubkey,
    pub knowledge_owner: Pubkey,
    pub last_claimed_timestamp: i64,
}
