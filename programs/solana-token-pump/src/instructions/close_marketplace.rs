use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::errors::MarketError;
use crate::states::marketplace::Marketplace;

pub fn close_marketplace(ctx: Context<CloseMarketplace>) -> Result<()> {
    let fee_vault = &ctx.accounts.fee_vault;
    let seeds = &[b"marketplace".as_ref(), &[ctx.bumps.marketplace]];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.fee_vault.to_account_info(),
                to: ctx.accounts.claim_fee_destination.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        ),
        fee_vault.amount,
    )?;

    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.utility_token_program.to_account_info(),
        token::CloseAccount {
            account: ctx.accounts.fee_vault.to_account_info(),
            destination: ctx.accounts.marketplace_owner.to_account_info(),
            authority: ctx.accounts.marketplace.to_account_info(),
        },
        signer_seeds,
    ))?;

    Ok(())
}

#[derive(Accounts)]
pub struct CloseMarketplace<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = marketplace_owner @ MarketError::MarketplaceNotOwnedByAccount,
        has_one = fee_vault @ MarketError::InvalidFeeAccount,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
        constraint = !marketplace.has_open_swaps() @ MarketError::MarketHasOpenSwaps, // all swaps should be closed
        close = marketplace_owner,
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
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
