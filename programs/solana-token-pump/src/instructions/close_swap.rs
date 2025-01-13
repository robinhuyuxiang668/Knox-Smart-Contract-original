use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

use crate::states::{marketplace::Marketplace, swap::Swap, token_vesting::TokenVesting};
use crate::{errors::MarketError, events::CloseSwapEvent};

pub fn close_swap(ctx: Context<CloseSwap>, is_forced_close: Option<bool>) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let token_vesting = &ctx.accounts.token_vesting;

    require!(
        !knowledge_swap.knowledge_token_vesting_created || token_vesting.is_some(),
        MarketError::TokenVestingMustBeExisted
    );

    let is_forced_close = is_forced_close.unwrap_or(false);
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    // Transfer all remaining knowledge token to marketplace owner ATA
    if ctx.accounts.knowledge_token_reserve.amount > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.knowledge_token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.knowledge_token_reserve.to_account_info(),
                    to: ctx
                        .accounts
                        .marketplace_owner_knowledge_token
                        .to_account_info(),
                    authority: knowledge_swap.to_account_info(),
                },
                signer,
            ),
            ctx.accounts.knowledge_token_reserve.amount,
        )?;
    }

    let mut can_claim_knowledge_token_lock = ctx.accounts.knowledge_token_lock.amount > 0;
    let mut can_close_knowledge_token_lock = ctx.accounts.knowledge_token_lock.amount == 0;
    if token_vesting.is_some() {
        can_claim_knowledge_token_lock = can_claim_knowledge_token_lock && is_forced_close;
    }

    if can_claim_knowledge_token_lock {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.knowledge_token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.knowledge_token_lock.to_account_info(),
                    to: ctx
                        .accounts
                        .marketplace_owner_knowledge_token
                        .to_account_info(),
                    authority: knowledge_swap.to_account_info(),
                },
                signer,
            ),
            ctx.accounts.knowledge_token_lock.amount,
        )?;
        can_close_knowledge_token_lock = true;
    }

    if can_close_knowledge_token_lock {
        // Close knowledge_token_reserve
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::CloseAccount {
                account: ctx.accounts.knowledge_token_reserve.to_account_info(),
                destination: ctx.accounts.marketplace_owner.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ))?;

        // Close utility_token_reserve
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::CloseAccount {
                account: ctx.accounts.utility_token_reserve.to_account_info(),
                destination: ctx.accounts.marketplace_owner.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ))?;

        // Close knowledge_token_lock Account
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::CloseAccount {
                account: ctx.accounts.knowledge_token_lock.to_account_info(),
                destination: ctx.accounts.marketplace_owner.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ))?;

        if token_vesting.is_some() {
            // Close token_vesting Account
            token_vesting.close(ctx.accounts.marketplace_owner.to_account_info())?;
        }

        // Close knowledge_swap
        knowledge_swap.close(ctx.accounts.marketplace_owner.to_account_info())?;

        // Decrease swap count in marketplace
        marketplace.swap_count -= 1;
    }

    emit!(CloseSwapEvent {
        knowledge_token_mint: knowledge_token_mint_key,
        knowledge_swap: knowledge_swap.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CloseSwap<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        has_one = marketplace_owner @ MarketError::MarketplaceNotOwnedByAccount,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        mut,
        associated_token::mint = knowledge_token_mint,
        associated_token::authority = marketplace_owner,
    )]
    pub marketplace_owner_knowledge_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = knowledge_swap.is_closed() @ MarketError::SwapMustBeClosed,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    /// Mint for knowledge token, each token is unique by hash
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
        mut,
        seeds = [
            b"knowledge_token_lock".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = knowledge_token_mint,
        token::authority = knowledge_swap,
    )]
    pub knowledge_token_lock: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub token_vesting: Option<Box<Account<'info, TokenVesting>>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
