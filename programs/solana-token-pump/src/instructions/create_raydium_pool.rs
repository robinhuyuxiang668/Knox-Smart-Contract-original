use anchor_lang::{prelude::*, solana_program::sysvar};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, OBSERVATION_SEED, POOL_LP_MINT_SEED, POOL_SEED, POOL_VAULT_SEED},
    AUTH_SEED,
};

use crate::{
    errors::MarketError, events::CreateRaydiumPoolEvent, states::swap::Swap, utils::flash_ixs,
};

pub fn create_raydium_pool(
    ctx: Context<CreateRaydiumPool>,
    distribute_instruction_index: u8,
    knowledge_token_mint: Pubkey,
) -> Result<()> {
    flash_ixs::create_pool_checks(&ctx, distribute_instruction_index, knowledge_token_mint)?;

    let token_0_amount: u64;
    let token_1_amount: u64;

    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let token_0_mint_key = ctx.accounts.token_0_mint.key();
    let token_1_mint_key = ctx.accounts.token_1_mint.key();

    if knowledge_token_mint == token_0_mint_key {
        require!(
            knowledge_swap.utility_token_mint == ctx.accounts.token_1_mint.key(),
            MarketError::InvalidUtilityTokenMint,
        );
        require!(
            knowledge_swap.utility_token_mint == token_1_mint_key
                && knowledge_swap.knowledge_token_mint == token_0_mint_key,
            MarketError::InvalidSwap,
        );
        require!(
            knowledge_swap.utility_token_current_amount <= ctx.accounts.operator_token_1.amount,
            MarketError::InsufficientUtilityAmountForCreatingPool,
        );

        token_0_amount = knowledge_swap.knowledge_token_dex_supply_amount;
        token_1_amount = knowledge_swap.utility_token_current_amount;
    } else {
        require!(
            knowledge_swap.utility_token_mint == token_0_mint_key,
            MarketError::InvalidUtilityTokenMint,
        );
        require!(
            knowledge_swap.utility_token_mint == token_0_mint_key
                && knowledge_swap.knowledge_token_mint == token_1_mint_key,
            MarketError::InvalidSwap,
        );
        require!(
            knowledge_swap.utility_token_current_amount <= ctx.accounts.operator_token_0.amount,
            MarketError::InsufficientUtilityAmountForCreatingPool,
        );

        token_0_amount = knowledge_swap.utility_token_current_amount;
        token_1_amount = knowledge_swap.knowledge_token_dex_supply_amount;
    }

    let cpi_accounts = cpi::accounts::Initialize {
        creator: ctx.accounts.operator.to_account_info(),
        creator_token_0: ctx.accounts.operator_token_0.to_account_info(),
        creator_token_1: ctx.accounts.operator_token_1.to_account_info(),
        creator_lp_token: ctx.accounts.operator_lp_token.to_account_info(),
        token_0_mint: ctx.accounts.token_0_mint.to_account_info(),
        token_1_mint: ctx.accounts.token_1_mint.to_account_info(),
        amm_config: ctx.accounts.raydium_amm_config.to_account_info(),
        pool_state: ctx.accounts.raydium_pool_state.to_account_info(),
        observation_state: ctx
            .accounts
            .raydium_pool_observation_state
            .to_account_info(),
        lp_mint: ctx.accounts.raydium_lp_mint.to_account_info(),
        token_0_vault: ctx.accounts.raydium_token_0_vault.to_account_info(),
        token_1_vault: ctx.accounts.raydium_token_1_vault.to_account_info(),
        create_pool_fee: ctx.accounts.raydium_fee_vault.to_account_info(),
        authority: ctx.accounts.raydium_authority.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        token_0_program: ctx.accounts.token_0_program.to_account_info(),
        token_1_program: ctx.accounts.token_1_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    cpi::initialize(
        CpiContext::new(
            ctx.accounts.raydium_cp_swap_program.to_account_info(),
            cpi_accounts,
        ),
        token_0_amount,
        token_1_amount,
        0,
    )?;

    knowledge_swap.utility_token_current_amount = 0;

    emit!(CreateRaydiumPoolEvent {
        operator: ctx.accounts.operator.key(),
        token_0_mint: token_0_mint_key,
        token_1_mint: token_1_mint_key,
        token_0_amount,
        token_1_amount,
        knowledge_swap: knowledge_swap.key()
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    distribute_instruction_index: u8,
    knowledge_token_mint: Pubkey,
)]
pub struct CreateRaydiumPool<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.as_ref(),
        ],
        bump,
        constraint = knowledge_swap.is_closed() @ MarketError::SwapMustBeClosed,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    #[account(
        mut,
        associated_token::mint = token_0_mint,
        associated_token::authority = operator,
    )]
    pub operator_token_0: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_1_mint,
        associated_token::authority = operator,
    )]
    pub operator_token_1: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: operator lp ATA token account, init by cp-swap
    #[account(mut)]
    pub operator_lp_token: UncheckedAccount<'info>,

    /// Token_0 mint, the key must smaller than token_1 mint.
    #[account(
        constraint = token_0_mint.key() < token_1_mint.key(),
        mint::token_program = token_0_program,
    )]
    pub token_0_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Token_1 mint, the key must grater then token_0 mint.
    #[account(
        mint::token_program = token_1_program,
    )]
    pub token_1_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Which config the pool belongs to.
    pub raydium_amm_config: Box<Account<'info, AmmConfig>>,

    /// CHECK: Initialize an account to store the pool state, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_SEED.as_bytes(),
            raydium_amm_config.key().as_ref(),
            token_0_mint.key().as_ref(),
            token_1_mint.key().as_ref(),
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_pool_state: UncheckedAccount<'info>,

    /// CHECK: an account to store oracle observations, init by cp-swap
    #[account(
        mut,
        seeds = [
            OBSERVATION_SEED.as_bytes(),
            raydium_pool_state.key().as_ref(),
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_pool_observation_state: UncheckedAccount<'info>,

    /// CHECK: pool lp mint, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_LP_MINT_SEED.as_bytes(),
            raydium_pool_state.key().as_ref(),
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_lp_mint: UncheckedAccount<'info>,

    /// CHECK: Token_0 vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            raydium_pool_state.key().as_ref(),
            token_0_mint.key().as_ref()
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_token_0_vault: UncheckedAccount<'info>,

    /// CHECK: Token_1 vault for the pool, init by cp-swap
    #[account(
        mut,
        seeds = [
            POOL_VAULT_SEED.as_bytes(),
            raydium_pool_state.key().as_ref(),
            token_1_mint.key().as_ref()
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_token_1_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        address = raydium_cpmm_cpi::create_pool_fee_reveiver::id(),
    )]
    pub raydium_fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: pool vault and lp mint authority
    #[account(
        seeds = [
            AUTH_SEED.as_bytes(),
        ],
        seeds::program = raydium_cp_swap_program.key(),
        bump,
    )]
    pub raydium_authority: UncheckedAccount<'info>,

    pub raydium_cp_swap_program: Program<'info, RaydiumCpmm>,
    /// Program to create mint account and mint tokens
    pub token_program: Program<'info, Token>,
    /// Spl token program or token program 2022
    pub token_0_program: Interface<'info, TokenInterface>,
    /// Spl token program or token program 2022
    pub token_1_program: Interface<'info, TokenInterface>,
    /// Program to create an ATA for receiving position NFT
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// To create a new program account
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:  Sysvar info
    #[account(address = sysvar::instructions::ID)]
    pub sysvar_info: AccountInfo<'info>,
}
