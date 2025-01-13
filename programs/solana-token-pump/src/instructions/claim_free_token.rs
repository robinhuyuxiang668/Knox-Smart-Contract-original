use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

use crate::{
    errors::MarketError,
    events::ClaimFreeTokenEvent,
    states::{marketplace::Marketplace, swap::Swap},
};

pub fn claim_free_token(ctx: Context<ClaimFreeToken>, claim_amount: u64) -> Result<()> {
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let curve_calculator = knowledge_swap.swap_curve.get_curve_calculator();

    let seeds: &[&[u8]] = &[b"marketplace".as_ref()];
    let bump: &[u8] = &[ctx.bumps.marketplace];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    // claim amount should be lte to current available knowledge token amount and should be positive
    require!(
        0 < claim_amount && claim_amount <= knowledge_swap.remaining_knowledge_token_amount(),
        MarketError::InvalidClaimAmount,
    );

    let new_knowledge_token_amount = knowledge_swap
        .knowledge_token_current_amount
        .checked_add(claim_amount)
        .unwrap();
    let new_utility_token_amount =
        curve_calculator.calculate_utility_token_amount(new_knowledge_token_amount);
    let required_utility_token_amount = new_utility_token_amount
        .checked_sub(knowledge_swap.utility_token_current_amount)
        .unwrap();

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.fee_vault.to_account_info(),
                to: ctx.accounts.utility_token_reserve.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer,
        ),
        required_utility_token_amount,
    )?;

    knowledge_swap.knowledge_token_current_amount = new_knowledge_token_amount;
    knowledge_swap.utility_token_current_amount = new_utility_token_amount;

    if knowledge_swap.remaining_knowledge_token_amount() == 0 {
        knowledge_swap.close_swap();
    }

    emit!(ClaimFreeTokenEvent {
        knowledge_token_mint: ctx.accounts.knowledge_token_mint.key(),
        claim_amount,
        required_utility_token_amount,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(timestamp: u32)]
pub struct ClaimFreeToken<'info> {
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
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
