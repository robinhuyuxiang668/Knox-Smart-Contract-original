use anchor_lang::prelude::*;
use chrono::DateTime;

use crate::{
    constants::{
        KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME,
        KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE,
        PRECISION,
    }, 
    errors::MarketError,
};

#[account]
pub struct TokenVesting {
    pub knowledge_owner: Pubkey,
    pub knowledge_token_mint: Pubkey,
    pub locking_knowledge_token_amount: u64,
    pub unlocked_knowledge_token_amount: u64,
    pub last_claimed_at: i64,
    pub last_unlocked_at: i64,
}

impl TokenVesting {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // knowledge_owner
        + 32                    // knowledge_token_mint
        + 8                     // locking_knowledge_token_amount
        + 8                     // unlocked_knowledge_token_amount
        + 8                     // last_claimed_at
        + 8                     // last_unlocked_at
    ;

    pub fn unlock(
        &mut self,
        current_timestamp: i64,
        custom_unlock_amount: Option<u64>,
    ) -> Result<u64> {
        let current_date = DateTime::from_timestamp(current_timestamp, 0).unwrap().date_naive();
        let last_claimed_at = DateTime::from_timestamp(self.last_claimed_at, 0).unwrap().date_naive();
        let day_diff = current_date.signed_duration_since(last_claimed_at).num_days().unsigned_abs();
        let mut amount_to_unlock = 0u64;
        let mut percent_to_unlocked = 0u64;
        for i in 0..KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME.len() {
            if day_diff > KNOWLEDGE_TOKEN_OWNER_CLAIM_LOCK_TIME[i] as u64 {
                percent_to_unlocked = percent_to_unlocked
                    .checked_add(KNOWLEDGE_TOKEN_OWNER_CLAIM_UNLOCK_RATE[i] as u64).unwrap();
            }
        }
        if percent_to_unlocked > 0 {
            let available_amount_to_unlock = (self.locking_knowledge_token_amount as u128)
                .checked_add(self.unlocked_knowledge_token_amount as u128).unwrap()
                .checked_mul(percent_to_unlocked as u128).unwrap()
                .checked_div(PRECISION as u128).unwrap()
                .checked_sub(self.unlocked_knowledge_token_amount as u128).unwrap() as u64;

            if custom_unlock_amount.is_some() {
                if custom_unlock_amount.unwrap() > available_amount_to_unlock {
                    return err!(MarketError::InvalidUnlockAmount);
                } else {
                    amount_to_unlock = custom_unlock_amount.unwrap();
                }
            } else {
                amount_to_unlock = available_amount_to_unlock;
            }
        }
        if amount_to_unlock > 0 {
            self.locking_knowledge_token_amount = self.locking_knowledge_token_amount.checked_sub(amount_to_unlock).unwrap();
            self.unlocked_knowledge_token_amount = self.unlocked_knowledge_token_amount.checked_add(amount_to_unlock).unwrap();
            self.last_unlocked_at = current_timestamp;
        }

        Ok(amount_to_unlock)
    }
}
