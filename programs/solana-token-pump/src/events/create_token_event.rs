use anchor_lang::prelude::*;

#[event]
pub struct CreateTokenEvent {
    pub buyer: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub hash: String,
}
