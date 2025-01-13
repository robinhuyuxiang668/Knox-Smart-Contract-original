use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{errors::MarketError, events::ClaimFeeEvent, states::marketplace::Marketplace};

pub fn claim_fee(ctx: Context<ClaimFee>, amount: u64) -> Result<()> {
    require!(
        amount > 0, // amount should be positive
        MarketError::InvalidFeeAmount,
    );
    let fee_vault = &ctx.accounts.fee_vault;
    require!(
        fee_vault.amount >= amount, // fee vault should have enough balance
        MarketError::InvalidFeeAmount,
    );

    let seeds = &[b"marketplace".as_ref(), &[ctx.bumps.marketplace]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: fee_vault.to_account_info(),
                to: ctx.accounts.claim_fee_destination.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    emit!(ClaimFeeEvent {
        claim_fee_destination: ctx.accounts.claim_fee_destination.key(),
        amount
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimFee<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = marketplace_owner @ MarketError::MarketplaceNotOwnedByAccount,
        has_one = fee_vault @ MarketError::InvalidFeeAccount,
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
        token::mint = utility_token_mint,
        constraint = fee_vault.key() != claim_fee_destination.key() @ MarketError::InvalidClaimFeeAccount,
    )]
    pub claim_fee_destination: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
