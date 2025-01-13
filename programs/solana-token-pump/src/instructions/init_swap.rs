use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{
    errors::MarketError,
    events::InitSwapEvent,
    states::{marketplace::Marketplace, swap::Swap},
};

pub fn init_swap(ctx: Context<InitSwap>, params: InitSwapParams) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    // Init the swap
    knowledge_swap.initialize_supply(
        marketplace,
        ctx.accounts.knowledge_token_owner_lock.key(),
        ctx.accounts.knowledge_token_reserve.key(),
        ctx.accounts.knowledge_token_mint.key(),
        ctx.accounts.utility_token_reserve.key(),
        ctx.accounts.utility_token_mint.key(),
    );

    // Increase swap count
    marketplace.swap_count = marketplace.swap_count.checked_add(1).unwrap();

    // Min total supply knowledge token
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.knowledge_token_mint.to_account_info(),
                to: ctx.accounts.knowledge_token_reserve.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        knowledge_swap
            .knowledge_token_max_supply_amount
            .checked_sub(knowledge_swap.knowledge_token_initial_supply_amount)
            .unwrap(),
    )?;

    // Min initial supply knowledge token
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.knowledge_token_mint.to_account_info(),
                to: ctx.accounts.knowledge_token_owner_lock.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        knowledge_swap.knowledge_token_initial_supply_amount,
    )?;

    emit!(InitSwapEvent {
        buyer: ctx.accounts.buyer.key(),
        knowledge_token_mint: knowledge_token_mint_key,
        hash: params.hash,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitSwapParams {
    pub hash: String, // unique hash for each token
}

#[derive(Accounts)]
#[instruction(params: InitSwapParams)]
pub struct InitSwap<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref()],
        bump,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        constraint = knowledge_swap.creator == buyer.key() @ MarketError::SwapCreatorMismatch,
        constraint = !knowledge_swap.is_initialized() || !knowledge_swap.is_closed() @ MarketError::SwapMustNotBeInitialized,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    /// Mint for knowledge token, each token is unique by hash
    #[account(
        mut,
        seeds = [
            b"knowledge_token_mint".as_ref(),
            params.hash.as_bytes().as_ref(),
        ],
        bump,
        mint::token_program = knowledge_token_program,
        mint::authority = knowledge_swap,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            b"knowledge_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = knowledge_token_mint,
        token::token_program = knowledge_token_program,
        token::authority = knowledge_swap,
    )]
    pub knowledge_token_reserve: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [
            b"knowledge_token_lock".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        payer = buyer,
        token::mint = knowledge_token_mint,
        token::authority = knowledge_swap,
        token::token_program = knowledge_token_program,
    )]
    pub knowledge_token_owner_lock: Box<Account<'info, TokenAccount>>,

    #[account(
        mint::token_program = utility_token_program,
    )]
    pub utility_token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            b"utility_token_reserve".as_ref(),
            knowledge_swap.key().as_ref(),
        ],
        bump,
        token::mint = utility_token_mint,
        token::token_program = utility_token_program,
        token::authority = knowledge_swap,
    )]
    pub utility_token_reserve: Box<Account<'info, TokenAccount>>,

    pub knowledge_token_program: Program<'info, Token>,
    pub utility_token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
