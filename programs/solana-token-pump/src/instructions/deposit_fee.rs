use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{errors::MarketError, events::DepositFeeEvent, states::marketplace::Marketplace};

pub fn deposit_fee(ctx: Context<DepositFee>, amount: u64) -> Result<()> {
    require!(
        amount > 0 && ctx.accounts.deposit_fee_account.amount >= amount, // amount should be positive
        MarketError::InvalidFeeAmount,
    );

    token::transfer(
        CpiContext::new(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.deposit_fee_account.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    emit!(DepositFeeEvent {
        depositor: ctx.accounts.depositor.key(),
        amount
    });

    Ok(())
}

#[derive(Accounts)]
pub struct DepositFee<'info> {
    #[account()]
    pub depositor: Signer<'info>,

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
            marketplace.key().as_ref()
        ],
        bump,
        token::mint = utility_token_mint,
        token::authority = marketplace,
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = utility_token_mint,
        associated_token::authority = depositor,
    )]
    pub deposit_fee_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
