pub trait CurveCalculator {
    fn calculate_utility_token_amount(
        &self,
        knowledge_token_amount: u64,
    ) -> u64;

    fn calculate_knowledge_token_amount(
        &self,
        utility_token_amount: u64,
    ) -> u64;

    fn calculate_knowledge_token_return(
        &self,
        deposit_utility_token_amount: u64,
        current_utility_token_amount: u64,
        current_knowledge_token_amount: u64,
    ) -> u64;

    fn calculate_utility_token_return(
        &self,
        sell_knowledge_token_amount: u64,
        current_utility_token_amount: u64,
        current_knowledge_token_amount: u64,
    ) -> u64;
}
