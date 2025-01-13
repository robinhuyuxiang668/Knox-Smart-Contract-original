use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::states::{
    curve::{swap_curve::SwapCurve, swap_fee::SwapFee},
    marketplace::Marketplace,
};

pub fn init_marketplace(
    ctx: Context<InitializeMarketplace>,
    swap_fee: SwapFee,
    swap_curve: SwapCurve,
) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;

    marketplace.initialize(
        ctx.accounts.marketplace_owner.key(),
        ctx.accounts.utility_token_mint.key(),
        ctx.accounts.fee_vault.key(),
        swap_fee,
        swap_curve,
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(mut)]
    pub marketplace_owner: Signer<'info>,

    #[account(
        init,
        seeds = [b"marketplace".as_ref()],
        bump,
        payer = marketplace_owner,
        space = Marketplace::SIZE,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        init,
        seeds = [
            b"fee_vault".as_ref(),
            marketplace.key().as_ref(),
        ],
        bump,
        payer = marketplace_owner,
        token::mint = utility_token_mint,
        token::authority = marketplace,
        token::token_program = utility_token_program,
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
