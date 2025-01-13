use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use chrono::{TimeZone, Utc};

use crate::events::CreateTokenVestingEvent;
use crate::states::marketplace::Marketplace;
use crate::{
    errors::MarketError,
    states::{swap::Swap, token_vesting::TokenVesting},
};

pub fn create_token_vesting(
    ctx: Context<CreateTokenVesting>,
    last_claimed_timestamp: i64,
    knowledge_owner: Pubkey,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_timestamp: i64 = clock.unix_timestamp;
    let token_vesting = &mut ctx.accounts.token_vesting;
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let is_valid_date_time = Utc
        .timestamp_opt(last_claimed_timestamp, 0)
        .single()
        .is_some();
    if is_valid_date_time == false {
        return err!(MarketError::InvalidClaimedDateTime);
    }
    if last_claimed_timestamp > current_timestamp {
        return err!(MarketError::ClaimedDateTimeIsAfterCurrentTime);
    }

    token_vesting.knowledge_owner = knowledge_owner;
    token_vesting.knowledge_token_mint = knowledge_token_mint_key;
    token_vesting.locking_knowledge_token_amount =
        knowledge_swap.knowledge_token_initial_supply_amount;
    token_vesting.unlocked_knowledge_token_amount = 0;
    token_vesting.last_claimed_at = last_claimed_timestamp;
    token_vesting.last_unlocked_at = 0;

    knowledge_swap.knowledge_token_vesting_created = true;

    emit!(CreateTokenVestingEvent {
        knowledge_owner,
        knowledge_token_mint: knowledge_token_mint_key,
        last_claimed_timestamp
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    last_claimed_timestamp: i64,
    knowledge_owner: Pubkey,
)]
pub struct CreateTokenVesting<'info> {
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
        init,
        seeds = [
            b"token_vesting",
            knowledge_owner.as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        payer = marketplace_owner,
        space = TokenVesting::SIZE,
    )]
    pub token_vesting: Box<Account<'info, TokenVesting>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    #[account(
        mut,
        mint::authority = knowledge_swap,
        mint::token_program = knowledge_token_program,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
