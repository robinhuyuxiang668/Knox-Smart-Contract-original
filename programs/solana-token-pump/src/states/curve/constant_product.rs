use crate::states::curve::curve_calculator::CurveCalculator;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
pub struct ConstantProductCurve {
    x: Decimal,
    y: Decimal,
}

impl ConstantProductCurve {
    pub fn new(params: [u128; 4]) -> Self {
        ConstantProductCurve {
            x: Decimal::from(params[0]),
            y: Decimal::from(params[1]),
        }
    }
}

impl CurveCalculator for ConstantProductCurve {
    fn calculate_utility_token_amount(&self, knowledge_token_amount: u64) -> u64 {
        let knowledge_token_amount = Decimal::from(knowledge_token_amount);
        ((self.x / (self.y - knowledge_token_amount)) * knowledge_token_amount).to_u64().unwrap()
    }

    fn calculate_knowledge_token_amount(&self, utility_token_amount: u64) -> u64 {
        let utility_token_amount = Decimal::from(utility_token_amount);
        ((self.y / (self.x + utility_token_amount)) * utility_token_amount).to_u64().unwrap()
    }

    fn calculate_knowledge_token_return(
        &self,
        deposit_utility_token_amount: u64,
        current_utility_token_amount: u64,
        current_knowledge_token_amount: u64,
    ) -> u64 {
        let new_utility_token_amount = current_utility_token_amount
            .checked_add(deposit_utility_token_amount)
            .unwrap();
        let new_knowledge_token_amount_supply =
            self.calculate_knowledge_token_amount(new_utility_token_amount);

        new_knowledge_token_amount_supply
            .checked_sub(current_knowledge_token_amount)
            .unwrap()
    }

    fn calculate_utility_token_return(
        &self,
        sell_knowledge_token_amount: u64,
        current_utility_token_amount: u64,
        current_knowledge_token_amount: u64,
    ) -> u64 {
        let new_knowledge_token_amount = current_knowledge_token_amount
            .checked_sub(sell_knowledge_token_amount)
            .unwrap();
        let new_utility_token_amount =
            self.calculate_utility_token_amount(new_knowledge_token_amount);

        current_utility_token_amount
            .checked_sub(new_utility_token_amount)
            .unwrap()
    }
}
