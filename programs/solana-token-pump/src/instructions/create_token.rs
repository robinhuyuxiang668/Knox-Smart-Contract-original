use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as Metaplex,
    },
    token::{Mint, Token},
};

use crate::{
    constants::KNOWLEDGE_TOKEN_DEFAULT_DECIMALS,
    errors::MarketError,
    events::CreateTokenEvent,
    states::{marketplace::Marketplace, swap::Swap},
};

pub fn create_token(ctx: Context<CreateToken>, params: CreateTokenParams) -> Result<()> {
    let knowledge_swap = &mut ctx.accounts.knowledge_swap;
    let knowledge_token_mint_key = ctx.accounts.knowledge_token_mint.key();

    let seeds: &[&[u8]] = &[
        b"knowledge_swap".as_ref(),
        knowledge_token_mint_key.as_ref(),
    ];
    let bump: &[u8] = &[ctx.bumps.knowledge_swap];
    let signer: &[&[&[u8]]] = &[&[seeds, &[bump]].concat()];

    let token_data = DataV2 {
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let metadata_ctx = CpiContext::new_with_signer(
        ctx.accounts
            .knowledge_token_metadata_program
            .to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: ctx.accounts.knowledge_token_metadata.to_account_info(),
            mint: ctx.accounts.knowledge_token_mint.to_account_info(),
            mint_authority: knowledge_swap.to_account_info(),
            update_authority: knowledge_swap.to_account_info(),
            payer: ctx.accounts.buyer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        signer,
    );

    create_metadata_accounts_v3(metadata_ctx, token_data, false, false, None)?;

    knowledge_swap.creator = ctx.accounts.buyer.key();

    emit!(CreateTokenEvent {
        buyer: ctx.accounts.buyer.key(),
        knowledge_token_mint: knowledge_token_mint_key,
        hash: params.hash,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct CreateTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub hash: String, // unique hash for each token
}

#[derive(Accounts)]
#[instruction(params: CreateTokenParams)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        seeds = [b"marketplace".as_ref()],
        bump,
        constraint = !marketplace.is_closed() @ MarketError::MarketplaceAlreadyClosed,
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(
        init,
        seeds = [
            b"knowledge_swap".as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        payer = buyer,
        space = Swap::SIZE,
    )]
    pub knowledge_swap: Box<Account<'info, Swap>>,

    /// Mint for knowledge token, each token is unique by hash
    #[account(
        init,
        seeds = [
            b"knowledge_token_mint".as_ref(),
            params.hash.as_bytes().as_ref(),
        ],
        bump,
        payer = buyer,
        mint::decimals = KNOWLEDGE_TOKEN_DEFAULT_DECIMALS,
        mint::authority = knowledge_swap,
        mint::freeze_authority = knowledge_swap,
        mint::token_program = token_program,
    )]
    pub knowledge_token_mint: Box<Account<'info, Mint>>,

    /// CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            knowledge_token_metadata_program.key().as_ref(),
            knowledge_token_mint.key().as_ref(),
        ],
        bump,
        seeds::program = knowledge_token_metadata_program.key()
    )]
    pub knowledge_token_metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub knowledge_token_metadata_program: Program<'info, Metaplex>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
