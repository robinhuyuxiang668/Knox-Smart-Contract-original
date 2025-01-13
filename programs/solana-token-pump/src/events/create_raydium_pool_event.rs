use anchor_lang::prelude::*;

#[event]
pub struct CreateRaydiumPoolEvent {
    pub operator: Pubkey,
    pub token_0_mint: Pubkey,
    pub token_1_mint: Pubkey,
    pub token_0_amount: u64,
    pub token_1_amount: u64,
    pub knowledge_swap: Pubkey,
}
