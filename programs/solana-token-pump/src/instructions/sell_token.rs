use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    errors::MarketError,
    events::SellTokenEvent,
    states::{curve::swap_curve::SwapDirection, marketplace::Marketplace, swap::Swap},
};

pub fn sell_token(ctx: Context<SellToken>, amount_in: u64, minimum_amount_out: u64) -> Result<()> {
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    // Amount should be positive
    require!(amount_in > 0, MarketError::InvalidSellAmount,);

    let (utility_token_amount, trade_fee) = knowledge_swap.swap(amount_in, SwapDirection::BtoA)?;
    if utility_token_amount < minimum_amount_out {
        return err!(MarketError::ExceededSlippage);
    }

    // burn knowledge token from seller
    token::transfer(
        CpiContext::new(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.seller_knowledge_token.to_account_info(),
                to: ctx.accounts.knowledge_token_reserve.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        amount_in,
    )?;

    // Transfer utility token from utility token reserve to seller
    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.utility_token_reserve.to_account_info(),
                to: ctx.accounts.seller_utility_token.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        utility_token_amount,
    )?;

    // Transfer trade fee from seller to fee vault
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.utility_token_reserve.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        trade_fee,
    )?;

    emit!(SellTokenEvent {
        seller: ctx.accounts.seller.key(),
        knowledge_token_mint: knowledge_token_mint_key,
        knowledge_token_amount: amount_in,
        utility_token_amount,
        trade_fee_amount: trade_fee
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = utility_token_mint,
        associated_token::authority = seller,
    )]
    pub seller_utility_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = knowledge_token_mint,
        associated_token::authority = seller,
    )]
    pub seller_knowledge_token: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        mut,
        seeds = [
            b"fee_vault".as_ref(),
            marketplace.key().as_ref(),
        ],
        bump,
        token::mint = utility_token_mint,
        token::authority = marketplace,
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        constraint = knowledge_swap.is_initialized() @ MarketError::SwapMustBeInitialized,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    #[account(
        mut,
        mint::authority = knowledge_swap,
        mint::token_program = knowledge_token_program,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            b"utility_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = utility_token_mint,
        token::authority = knowledge_swap,
    )]
    pub utility_token_reserve: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = knowledge_token_mint,
        token::authority = knowledge_swap,
    )]
    pub knowledge_token_reserve: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
