use rust_decimal::prelude::FromPrimitive;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use rust_decimal::MathematicalOps;

use crate::constants::PRECISION;
use crate::constants::SWAP_CURVE_PRECISION;
use crate::states::curve::curve_calculator::CurveCalculator;

pub struct ExponentialCurve {
    price_coefficient: Decimal,
    exponent_factor: Decimal,
}

impl ExponentialCurve {
    pub fn new(params: [u128; 4]) -> Self {
        let precision = Decimal::from_u128(SWAP_CURVE_PRECISION).unwrap();

        ExponentialCurve {
            price_coefficient: Decimal::from_u128(params[0])
                .unwrap()
                .checked_div(precision)
                .unwrap(), // m
            exponent_factor: Decimal::from_u128(params[1])
                .unwrap()
                .checked_div(precision)
                .unwrap(), // n
        }
    }
}

impl CurveCalculator for ExponentialCurve {
    fn calculate_utility_token_amount(&self, knowledge_token_amount: u64) -> u64 {
        let precision = Decimal::from_u32(PRECISION).unwrap();

        let knowledge_token_amount_dn = Decimal::from_u64(knowledge_token_amount)
            .unwrap()
            .checked_div(precision)
            .unwrap();

        let expr_1 = self
            .price_coefficient
            .checked_div(self.exponent_factor)
            .unwrap();

        let expr_2 = self
            .exponent_factor
            .checked_mul(knowledge_token_amount_dn)
            .unwrap()
            .checked_exp_with_tolerance(Decimal::from_f32(0.00000000001).unwrap())
            .unwrap()
            .checked_sub(Decimal::ONE)
            .unwrap();

        // (price_coefficient / exponent_factor) * ((exponent_factor * knowledge_token_amount).exp() - 1)
        expr_1
            .checked_mul(expr_2)
            .unwrap()
            .checked_mul(precision)
            .unwrap()
            .to_u64()
            .unwrap()
    }

    fn calculate_knowledge_token_amount(&self, utility_token_amount: u64) -> u64 {
        let precision = Decimal::from_u32(PRECISION).unwrap();

        let utility_token_amount_dn = Decimal::from_u64(utility_token_amount)
            .unwrap()
            .checked_div(precision)
            .unwrap();

        let expr_1 = Decimal::ONE.checked_div(self.exponent_factor).unwrap();

        let expr_2 = self
            .exponent_factor
            .checked_mul(utility_token_amount_dn)
            .unwrap()
            .checked_div(self.price_coefficient)
            .unwrap()
            .checked_add(Decimal::ONE)
            .unwrap()
            .checked_ln()
            .unwrap();

        // (1 / exponent_factor) * ln((exponent_factor * utility_token_amount / price_coefficient) + 1)
        expr_1
            .checked_mul(expr_2)
            .unwrap()
            .checked_mul(precision)
            .unwrap()
            .to_u64()
            .unwrap()
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
