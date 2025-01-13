# Localnet
metadataProgram = --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./local_programs/metadata.so
raydiumProgram = --bpf-program CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C ./local_programs/raydium_cpmm_cpi.so
ammConfigAccount = --account D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2 ./local_accounts/amm_config.json
feeReceiver = --account DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8 ./local_accounts/fee_receiver.json
devnetFeatures = --features "devnet"
devnetCluster = --provider.cluster "devnet"
localFeatures = --features "localnet"
localCluster = --provider.cluster "localnet"

test-localnet-env:
	solana-test-validator $(metadataProgram) $(raydiumProgram) $(ammConfigAccount) $(feeReceiver) --reset

test-localnet-skip:
	anchor test --skip-local-validator -- $(localFeatures)

test-localnet:
	anchor test -- $(localFeatures)

set-localnet:
	solana config set -u l

build-localnet:
	anchor build $(localCluster) -- --no-default-features $(localFeatures)

# Devnet
test-devnet:
	anchor test --skip-build --skip-deploy --skip-local-validator -- $(devnetFeatures)

build-devnet:
	anchor build $(devnetCluster) -- --no-default-features $(devnetFeatures) 

deploy-devnet:
	anchor deploy $(devnetCluster)
	
set-devnet:
	solana config set -u d  

