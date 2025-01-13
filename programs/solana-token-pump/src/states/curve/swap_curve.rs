use anchor_lang::prelude::*;

use crate::states::curve::{
    constant_product::ConstantProductCurve,
    curve_calculator::CurveCalculator,
    exponential::ExponentialCurve,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum CurveType {
    /// Uniswap-style constant product curve, invariant = token_a_amount * token_b_amount
    ConstantProduct,
    /// Exponential curve, price = m * e ^ (n * supply)
    Exponential,
}

pub enum SwapDirection {
    /// Input token A (utility), output token B (knowledge)
    AtoB,
    /// Input token B (knowledge), output token A (utility)
    BtoA,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct SwapCurve {
    pub curve_type: CurveType,
    pub curve_params: [u128; 4], // allow max 4 u128s to represent the curve params
}

impl SwapCurve {
    pub const SIZE: usize = 0
        + 1                     // curve_type
        + 4 * 16                // curve_params
    ;

    pub fn get_curve_calculator(&self) -> Box<dyn CurveCalculator> {
        match self.curve_type {
            CurveType::ConstantProduct => Box::new(ConstantProductCurve::new(self.curve_params)),
            CurveType::Exponential => Box::new(ExponentialCurve::new(self.curve_params)),
        }
    }
}
