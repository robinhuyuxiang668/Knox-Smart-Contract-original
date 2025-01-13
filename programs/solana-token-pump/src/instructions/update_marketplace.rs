use anchor_lang::prelude::*;

use crate::{
    errors::MarketError,
    events::UpdateMarketplaceEvent,
    states::{
        curve::{swap_curve::SwapCurve, swap_fee::SwapFee},
        marketplace::Marketplace,
    },
};

pub fn update_marketplace(
    ctx: Context<UpdateMarketplace>,
    knowledge_token_initial_supply_amount: Option<u64>,
    knowledge_token_max_supply_amount: Option<u64>,
    knowledge_token_dex_supply_amount: Option<u64>,
    swap_fee: Option<SwapFee>,
    swap_curve: Option<SwapCurve>,
) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    if knowledge_token_initial_supply_amount.is_some() {
        marketplace.knowledge_token_initial_supply_amount =
            knowledge_token_initial_supply_amount.unwrap();
    }
    if knowledge_token_max_supply_amount.is_some() {
        marketplace.knowledge_token_max_supply_amount = knowledge_token_max_supply_amount.unwrap();
    }
    if swap_fee.is_some() {
        marketplace.swap_fee = swap_fee.unwrap();
    }
    if swap_curve.is_some() {
        marketplace.swap_curve = swap_curve.unwrap();
    }
    if swap_curve.is_some() {
        marketplace.knowledge_token_dex_supply_amount = knowledge_token_dex_supply_amount.unwrap();
    }

    emit!(UpdateMarketplaceEvent {
        knowledge_token_initial_supply_amount,
        knowledge_token_max_supply_amount,
        knowledge_token_dex_supply_amount,
        swap_fee,
        swap_curve
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateMarketplace<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = marketplace_owner @ MarketError::MarketplaceNotOwnedByAccount,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    pub system_program: Program<'info, System>,
}
