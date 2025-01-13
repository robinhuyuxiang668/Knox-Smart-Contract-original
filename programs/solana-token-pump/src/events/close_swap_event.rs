use anchor_lang::prelude::*;

#[event]
pub struct CloseSwapEvent {
    pub knowledge_token_mint: Pubkey,
    pub knowledge_swap: Pubkey,
}
