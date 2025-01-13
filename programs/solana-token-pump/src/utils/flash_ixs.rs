use anchor_lang::{
    err, prelude::*, solana_program::instruction::Instruction, Discriminator, Key, Result,
};

use super::ix_utils::{self, InstructionLoader};
use crate::{
    instructions::{
        flash_distribute_additional_pair_amount::FlashDistributeAdditionalPairAmount,
        create_raydium_pool::CreateRaydiumPool,
    },
    instruction::{
        FlashDistributeAdditionalPairAmount as FlashDistributeAdditionalPairAmountArgs,
        CreateRaydiumPool as CreateRaydiumPoolArgs,
    },
    errors::MarketError,
};

pub fn create_pool_checks(
    ctx: &Context<CreateRaydiumPool>,
    distribute_additional_instruction_index: u8,
    knowledge_token_mint: Pubkey,
) -> Result<()> {
    let instruction_loader = ix_utils::BpfInstructionLoader {
        instruction_sysvar_account_info: &ctx.accounts.sysvar_info,
    };
    let current_index: usize = instruction_loader.load_current_index()?.into();
    if instruction_loader.is_flash_forbidden_cpi_call()? {
        return err!(MarketError::CreateRaydiumPoolCpi);
    }

    if (distribute_additional_instruction_index as usize) > current_index {
        return err!(MarketError::InvalidInstructionIndexCreateRaydiumPool);
    }

    let distribute_instruction = instruction_loader.load_instruction_at(distribute_additional_instruction_index as usize)?;
    if distribute_instruction.program_id != *ctx.program_id {
        return err!(MarketError::InvalidInstructionIndexCreateRaydiumPool);
    }

    let discriminator = FlashDistributeAdditionalPairAmountArgs::DISCRIMINATOR;
    let token_0_key = ctx.accounts.operator_token_0.key();
    let token_1_key = ctx.accounts.operator_token_1.key();
    
    let token_pair = if knowledge_token_mint == ctx.accounts.token_0_mint.key() {
        (token_0_key, token_1_key)
    } else {
        (token_1_key, token_0_key)
    };
    
    // ! Caution: Be aware when changing accounts's order cause it can affect these validations
    if distribute_instruction.data[..8] != discriminator {
        return err!(MarketError::DistributeAdditionalPairAmountCpiMismatchIndex);
    }
    if distribute_instruction.accounts[0].pubkey != ctx.accounts.operator.key() {
        return err!(MarketError::InvalidRaydiumPoolOperator);
    }
    if knowledge_token_mint != distribute_instruction.accounts[6].pubkey {
        return err!(MarketError::InvalidRaydiumPoolKnowledgeTokenMint);
    }
    if distribute_instruction.accounts[5].pubkey != ctx.accounts.knowledge_swap.key() {
        return err!(MarketError::InvalidRaydiumPoolKnowledgeSwap);
    }
    if distribute_instruction.accounts[1].pubkey != token_pair.0 {
        return err!(MarketError::InvalidRaydiumPoolKnowledgeOperator);
    }
    if distribute_instruction.accounts[2].pubkey != token_pair.1 {
        return err!(MarketError::InvalidRaydiumPoolUtilityOperator);
    }

    Ok(())
}

pub fn distribute_additional_checks(
    ctx: &Context<FlashDistributeAdditionalPairAmount>,
) -> Result<()> {
    let instruction_loader = ix_utils::BpfInstructionLoader {
        instruction_sysvar_account_info: &ctx.accounts.sysvar_info,
    };

    let current_index: usize = instruction_loader.load_current_index()?.into();
    if instruction_loader.is_flash_forbidden_cpi_call()? {
        return err!(MarketError::DistributeAdditionalPairAmountCpi);
    }

    let ix_iterator = ix_utils::IxIterator::new_at(current_index + 1, &instruction_loader);
    let mut found_create_pool_ix = false;

    let create_raydium_discriminator = CreateRaydiumPoolArgs::DISCRIMINATOR;
    let distribute_additional_pair_amount_discriminator = FlashDistributeAdditionalPairAmountArgs::DISCRIMINATOR;

    for ixn in ix_iterator {
        let ixn = ixn?;
        if ixn.program_id != crate::ID {
            continue;
        }

        if ixn.data[..8] == distribute_additional_pair_amount_discriminator {
            return err!(MarketError::MultipleDistributeAdditionalPairAmount);
        }

        if ixn.data[..8] == create_raydium_discriminator {
            if found_create_pool_ix {
                return err!(MarketError::MultipleCreateRaydiumPool);
            }
            distribute_check_matching_create_pool(&ixn, current_index)?;

            found_create_pool_ix = true;
        }
    }

    if !found_create_pool_ix {
        return err!(MarketError::NoCreateRaydiumPoolFound);
    }

    Ok(())
}

fn distribute_check_matching_create_pool(
    create_pool_ix: &Instruction,
    distribute_index: usize,
) -> Result<()> {
    let create_pool_ix_data = CreateRaydiumPoolArgs::try_from_slice(&create_pool_ix.data[8..])?;

    let distribute_instruction_index = create_pool_ix_data.distribute_instruction_index;
    
    if (usize::from(distribute_instruction_index)) != distribute_index {
        return err!(MarketError::InvalidDistributeAdditionalPairAmount);
    }

    Ok(())
}
