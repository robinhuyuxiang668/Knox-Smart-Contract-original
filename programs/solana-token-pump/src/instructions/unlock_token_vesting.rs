use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::IS_TESTING,
    errors::MarketError,
    events::UnlockTokenVestingEvent,
    states::{marketplace::Marketplace, swap::Swap, token_vesting::TokenVesting},
};

pub fn unlock_token_vesting(
    ctx: Context<UnlockTokenVesting>,
    unlock_amount: Option<u64>,
    unlock_timestamp: Option<i64>, // This param is only for testing purpose
) -> Result<()> {
    if unlock_amount.is_some() && unlock_amount.unwrap() == 0 {
        return err!(MarketError::InvalidInputUnlockAmount);
    }

    let clock = Clock::get()?;
    let current_timestamp = if IS_TESTING && unlock_timestamp.is_some() {
        unlock_timestamp.unwrap()
    } else {
        clock.unix_timestamp
    };

    let token_vesting = &mut ctx.accounts.token_vesting;
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let last_unlocked_knowledge_token_amount = token_vesting.unlocked_knowledge_token_amount;
    let new_knowledge_token_amount_to_unlock =
        token_vesting.unlock(current_timestamp, unlock_amount)?;

    if new_knowledge_token_amount_to_unlock <= 0 {
        return err!(MarketError::NoAmountToUnlock);
    }

    // Transfer knowledge token to owner
    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.knowledge_token_lock.to_account_info(),
                to: ctx.accounts.owner_knowledge_token.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        new_knowledge_token_amount_to_unlock,
    )?;

    let curve_calculator = knowledge_swap.swap_curve.get_curve_calculator();
    let last_supplied_utility_token_amount =
        curve_calculator.calculate_utility_token_amount(last_unlocked_knowledge_token_amount);
    let new_supplied_utility_token_amount = curve_calculator
        .calculate_utility_token_amount(token_vesting.unlocked_knowledge_token_amount);
    let utility_token_amount_to_supply = new_supplied_utility_token_amount
        .checked_sub(last_supplied_utility_token_amount)
        .unwrap();

    // Transfer utility token from owner to utility token reserve
    token::transfer(
        CpiContext::new(
            ctx.accounts.utility_token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.owner_utility_token.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
                authority: ctx.accounts.knowledge_owner.to_account_info(),
            },
        ),
        utility_token_amount_to_supply,
    )?;

    emit!(UnlockTokenVestingEvent {
        knowledge_owner: ctx.accounts.knowledge_owner.key(),
        knowledge_token_mint: knowledge_token_mint_key,
        unlock_knowledge_token_amount: new_knowledge_token_amount_to_unlock,
        utility_token_amount: utility_token_amount_to_supply
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UnlockTokenVesting<'info> {
    #[account(mut)]
    pub knowledge_owner: Signer<'info>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = fee_vault @ MarketError::InvalidFeeAccount,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        mut,
        associated_token::mint = knowledge_token_mint,
        associated_token::authority = knowledge_owner,
    )]
    pub owner_knowledge_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = utility_token_mint,
        associated_token::authority = knowledge_owner,
    )]
    pub owner_utility_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"token_vesting",
            knowledge_owner.key().as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        has_one = knowledge_owner @ MarketError::KnowledgeTokenLockNotLockedByAccount,
        has_one = knowledge_token_mint @ MarketError::InvalidKnowledgeTokenMint,
    )]
    pub token_vesting: Box<Account<'info, TokenVesting>>,

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
            b"knowledge_token_lock".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = knowledge_token_mint,
        token::authority = knowledge_swap,
    )]
    pub knowledge_token_lock: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
