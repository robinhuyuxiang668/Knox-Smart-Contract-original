use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{errors::MarketError, states::swap::Swap};

pub fn create_token_reserves(
    _ctx: Context<CreateTokenReserves>,
    _params: CreateTokenReservesParams,
) -> Result<()> {
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct CreateTokenReservesParams {
    pub hash: String, // unique hash for each token
}

#[derive(Accounts)]
#[instruction(params: CreateTokenReservesParams)]
pub struct CreateTokenReserves<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        constraint = knowledge_swap.creator == buyer.key() @ MarketError::SwapCreatorMismatch,
        constraint = !knowledge_swap.is_initialized() || !knowledge_swap.is_closed() @ MarketError::SwapMustNotBeInitialized,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    /// Mint for knowledge token, each token is unique by hash
    #[account(
        mut,
        seeds = [
            b"knowledge_token_mint".as_ref(),
            params.hash.as_bytes().as_ref(),
        ],
        bump,
        mint::token_program = knowledge_token_program,
        mint::authority = knowledge_swap,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        seeds = [
            b"knowledge_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        payer = buyer,
        token::mint = knowledge_token_mint,
        token::token_program = knowledge_token_program,
        token::authority = knowledge_swap,
    )]
    pub knowledge_token_reserve: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        seeds = [
            b"utility_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        payer = buyer,
        token::mint = utility_token_mint,
        token::token_program = utility_token_program,
        token::authority = knowledge_swap,
    )]
    pub utility_token_reserve: Box<Account<'info, TokenAccount>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
