use anchor_lang::{prelude::*, solana_program::sysvar};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

use crate::states::marketplace::Marketplace;
use crate::{errors::MarketError, states::swap::Swap, utils::flash_ixs};

pub fn flash_distribute_additional_pair_amount(
    ctx: Context<FlashDistributeAdditionalPairAmount>,
) -> Result<()> {
    flash_ixs::distribute_additional_checks(&ctx)?;

    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = &mut ctx.accounts.knowledge_token_mint.key();

    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    // Mint knowledge token to operator account
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.knowledge_token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.knowledge_token_mint.to_account_info(),
                to: ctx.accounts.operator_knowledge_token.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        knowledge_swap.knowledge_token_dex_supply_amount,
    )?;

    // Transfer utility token from utility token reserve to operator account
    token::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.utility_token_program.to_account_info(),
            token::TransferChecked {
                mint: ctx.accounts.utility_token_mint.to_account_info(),
                from: ctx.accounts.utility_token_reserve.to_account_info(),
                to: ctx.accounts.operator_utility_token.to_account_info(),
                authority: knowledge_swap.to_account_info(),
            },
            signer,
        ),
        ctx.accounts.utility_token_reserve.amount,
        ctx.accounts.utility_token_mint.decimals,
    )?;

    let missing_utility_token_amount = knowledge_swap
        .utility_token_current_amount
        .checked_sub(ctx.accounts.utility_token_reserve.amount)
        .unwrap();
    if missing_utility_token_amount > 0 {
        //Trasfer utility token from fee vault to operator account
        let seeds = &[b"marketplace".as_ref(), &[ctx.bumps.marketplace]];
        let signer = &[&seeds[..]];

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.utility_token_program.to_account_info(),
                token::TransferChecked {
                    mint: ctx.accounts.utility_token_mint.to_account_info(),
                    from: ctx.accounts.fee_vault.to_account_info(),
                    to: ctx.accounts.operator_utility_token.to_account_info(),
                    authority: ctx.accounts.marketplace.to_account_info(),
                },
                signer,
            ),
            missing_utility_token_amount,
            ctx.accounts.utility_token_mint.decimals,
        )?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct FlashDistributeAdditionalPairAmount<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = knowledge_token_mint,
        associated_token::authority = operator,
    )]
    pub operator_knowledge_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = utility_token_mint,
        associated_token::authority = operator,
    )]
    pub operator_utility_token: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
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
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        has_one = utility_token_mint @ MarketError::InvalidUtilityTokenMint,
        constraint = knowledge_swap.is_closed() @ MarketError::SwapMustBeClosed,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    #[account(
        mut,
        mint::authority = knowledge_swap,
        mint::token_program = knowledge_token_program,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

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
        token::authority = knowledge_swap,
        token::mint = utility_token_mint,
    )]
    pub utility_token_reserve: Box<Account<'info, TokenAccount>>,

    pub utility_token_program: Program<'info, Token>,
    pub knowledge_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK:  Sysvar info
    #[account(address = sysvar::instructions::ID)]
    pub sysvar_info: AccountInfo<'info>,
}
