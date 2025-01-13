use anchor_lang::prelude::*;

#[event]
pub struct InitSwapEvent {
    pub buyer: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub hash: String,
}
