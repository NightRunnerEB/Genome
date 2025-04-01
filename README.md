# Genome Solana

## Usage

### Testing
There are two types of tests for now:
- `required` - minimal test suite to run general flow
- `negative` - negative tests

**NOTE:** CI/CD is using the whole test suite (required && negative)

Rules of writing tests:
1. Test cases **MUST** be marked as `required` or `negative` at the end of the testcase title. <br>
Example in `genomeOmni.test.ts` file

#### Run the minimal tests suite
```sh
# Run only required tests suite (excluding negative tests)
anchor test
```

#### Run the whole test suite
```sh
# Run the whole test suite (including negative tests)
anchor run test-all
```

### Run scripts

#### Initialize Genome Omnichain
```sh
anchor run initialize-omni -- <uts-program-pubkey> <bridge-fee-lamports> <genome-chain-id> <admin-pubkey>
# Example: anchor run initialize-omni -- A1fHuoDBndYhFCpqTKUh4Y8d2xS7CQRBWPngQTw5mmqY 10000000 491149 FaYwSTED3Q5zPVKmUuD2w1YQqcwt79fwY5ZGT8CFMU4B

anchor account genome_solana.GenomeOmniConfig <genome-omni-config-pubkey>
# Example: anchor account genome_solana.GenomeOmniConfig DM1YwUm9jhvK3xnJi5TsUak9CwA6udoUjPWr5byTDe2h
# {
#   "admin": "FaYwSTED3Q5zPVKmUuD2w1YQqcwt79fwY5ZGT8CFMU4B",
#   "bridge_fee": 10000000,
#   "genome_chain_id": 491149,
#   "uts_program": "A1fHuoDBndYhFCpqTKUh4Y8d2xS7CQRBWPngQTw5mmqY"
# }
```

#### Set bridge fee
```sh
anchor run set-bridge-fee -- <bridge-fee>
# Example: anchor run set-bridge-fee -- 123456789

anchor account genome_solana.GenomeOmniConfig <genome-omni-config-pubkey>
# Example: anchor account genome_solana.GenomeOmniConfig DM1YwUm9jhvK3xnJi5TsUak9CwA6udoUjPWr5byTDe2h
# {
#   "admin": "FaYwSTED3Q5zPVKmUuD2w1YQqcwt79fwY5ZGT8CFMU4B",
#   "bridge_fee": 123456789,  <-- CHANGED
#   "genome_chain_id": 491149,
#   "uts_program": "A1fHuoDBndYhFCpqTKUh4Y8d2xS7CQRBWPngQTw5mmqY"
# }
```
