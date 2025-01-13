use anchor_lang::prelude::*;

use crate::states::curve::{swap_curve::SwapCurve, swap_fee::SwapFee};

#[event]
pub struct UpdateMarketplaceEvent {
    pub knowledge_token_initial_supply_amount: Option<u64>,
    pub knowledge_token_max_supply_amount: Option<u64>,
    pub knowledge_token_dex_supply_amount: Option<u64>,
    pub swap_fee: Option<SwapFee>,
    pub swap_curve: Option<SwapCurve>,
}
