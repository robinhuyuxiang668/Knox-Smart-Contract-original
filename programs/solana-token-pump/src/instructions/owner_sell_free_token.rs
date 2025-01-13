use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    errors::MarketError,
    events::OwnerSellFreeTokenEvent,
    states::{curve::swap_curve::SwapDirection, marketplace::Marketplace, swap::Swap},
};

pub fn owner_sell_free_token(ctx: Context<OwnerSellFreeToken>, sell_amount: u64) -> Result<()> {
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;

    // claim amount should be lte to current supplied knowledge token amount and have to be gte 0
    require!(
        0 < sell_amount && sell_amount <= knowledge_swap.knowledge_token_current_amount,
        MarketError::InvalidClaimAmount,
    );

    let (return_utility_token_amount, swap_fee) =
        knowledge_swap.swap(sell_amount, SwapDirection::BtoA)?;
    let transfer_amount = return_utility_token_amount.checked_add(swap_fee).unwrap();

    // Transfer utility token to requester
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    // Requestor pay fee for tx
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.utility_token_reserve.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
                authority: ctx.accounts.knowledge_swap.to_account_info(),
            },
            signer,
        ),
        transfer_amount,
    )?;

    emit!(OwnerSellFreeTokenEvent {
        knowledge_token_mint: knowledge_token_mint_key,
        knowledge_token_amount: sell_amount,
        utility_token_amount: transfer_amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct OwnerSellFreeToken<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = marketplace_owner @ MarketError::MarketplaceNotOwnedByAccount,
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
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    #[account(
        mut,
        mint::token_program = knowledge_token_program,
        mint::authority = knowledge_swap,
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
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
