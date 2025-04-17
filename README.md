# Genome Solana Tournament Platform

## About

### Overview

Genome is a decentralized platform built on Solana for creating, managing, and participating in team-based tournaments. The platform enables organizers to create tournaments, participants to register, and leverages decentralized consensus from trusted verifiers for state transitions such as starting, canceling, or finishing tournaments.

**Key functionalities include:**

- **Platform Initialization:**  
  - The owner configures the platform by setting up parameters in the `GenomeConfig`.
- **Grant/Revoke Role**  
  - The platform admin can assign one or more roles to a user using the grant_role instruction. Roles can be Verifier, Operator, or Organizer.
  - Conversely, the revoke_role instruction allows the admin to remove a specific role from a user. In the case of verifiers, the user’s address is also removed from the configuration.
- **Approve/Ban Token**  
  - The operator registers (approves) a token via the approve_token instruction. This action creates or updates a dedicated token account (PDA) containing parameters such as the minimum sponsor pool and entry fee thresholds.
  - Additionally, the operator can disable a token using the ban_token instruction, ensuring that only authorized tokens are used on the platform.
- **Tournament Creation:**  
  - Organizers create tournaments by providing parameters such as organizer fee, expiration time, entry fee, team size, asset mint, and team limits.
- **Tournament Registration:**  
  - Participants register by either forming a new team (in which case the first registrant becomes the team captain) or by joining an existing team.
- **Tournament Start:**  
  - Each verifier calls the `start_tournament` instruction.  
  - Each call increments a consensus counter in the tournament record. Every verifier receives a fee for voting.
  - When the consensus counter reaches the threshold defined in the `GenomeConfig`, the tournament status changes.
  - Additionally, any teams that are incomplete are marked as canceled so that participants can later claim refunds.
- **Tournament Finish & Cancel**  
  - The cancellation of the tournament and the finish are also called using verifiers and the status of the tournament is changed to the appropriate one.
    1. In case of cancellation, all participants of the tournament and sponsors can withdraw their tokens.
    2. In the case of the final, the winning team is determined, which subsequently has the right to call the instructions for receiving the draw.
- **Claim refund/reward**
  - The sponsor and participant can collect the prize or refund tokens if all conditions are met.

### Links

- [Project Specification Document](https://entangle.atlassian.net/wiki/spaces/ENTN/pages/264339472/Team+tournament+single+chain)

---

## Testing

There are two types of tests for now:

- `required` - minimal test suite to run general flow
- `negative` - negative tests

**NOTE:** CI/CD is using the whole test suite (required && negative)

Rules of writing tests:

1. Test cases **MUST** be marked as `required` or `negative` at the end of the testcase title. <br>
Example in `genomeOmni.test.ts` file

### Singlechain

#### Running Tests

To run tests, use the following command:

##### Run the minimal tests suite

```sh
# Run only required tests suite (excluding negative tests)
anchor run test-single
```

##### Run the whole test suite

```sh
# Run the whole test suite (including negative tests)
anchor run test-single-all
```

---

#### Run scripts

##### Initialize Genome Program

Before testing the program, you need to create tokens and set up all accounts. This can be done in the following way:

Creating a Tournament token:

```rs
spl-token create-token -u <network> <path-to-token-keypair>
// Example: spl-token create-token -u localhost keys/token.json
```

Creating a Genome token:

```rs
spl-token create-token -u <network> <path-to-nome-keypair>
// Example: spl-token create-token -u localhost keys/nome.json
```

Setting up wallets:

1. Airdrop sol

```rs
solana airdrop 10 <account-pubkey>

/* Example: 
  solana airdrop 10 6MurAyX9MiuLV8ufEeAN26w1KTbT1yDKCAcQF1bHQHCx
  solana airdrop 10 CB39FqtnDdACX9XkwjsA2gYGd7ZfxjveMewhxRoB9c8k
  solana airdrop 10 6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne
  solana airdrop 10 Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ
  solana airdrop 10 FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy
  solana airdrop 10 9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL
  solana airdrop 10 6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT
  solana airdrop 10 ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz
  */
```

2. Create token ata. You should do it for Genome Token and Tournament Token.

Genome Token:

```rs
anchor run create-ata -- \
  <path-to-payer-keypair> \
  <path-to-tokenAuthority-keypair> \
  <token-pubkey> \
  <account-pubkey1> \
  <account-pubkey2> \
  <account-pubkey3> \
  ...

/* Example: 
  anchor run create-ata -- \
  /Users/evgeniybukharev/.config/solana/id.json \
  /Users/evgeniybukharev/.config/solana/id.json \
  Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz \
  FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
  9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL \
  3JYy8phwkVSXq6D9LLdhGtTh2Z3sW3hJSmveHCva4pxk
  */
```

Tournament Token:

```rs
anchor run create-ata -- \
  <path-to-payer-keypair> \
  <path-to-tokenAuthority-keypair> \
  <token-pubkey> \
  <account-pubkey1> \
  <account-pubkey2> \
  <account-pubkey3> \
  ...

/* Example: 
  anchor run create-ata -- \
  /Users/evgeniybukharev/.config/solana/id.json \
  /Users/evgeniybukharev/.config/solana/id.json \
  6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne \
  Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ \
  6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz \
  Dxp1rJmA7ei16EcsjiXHGntT9KuTMXBMXAkFiy6vWSVr \
  23sTZbMHjs2tH5fan7FgQWU8eeaVzLA6L6p2vdRoH7xq \
  5RuyKrrBCD6URTNQEujCJn9WEB6ssypaAfGWzbU5tGtX
  */
```

Initialize Genome Program

```rs
anchor run initialize-single -- \
<tournamentNonce> <platformFee> <minTeams> <maxTeams> <falsePrecision> <maxOrganizerFee> <nome-pubkey>

/* Example:
    anchor run initialize-single -- \
    10 10 2 20 65 5000 6600 \
    Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ
*/
```

##### Grant/Revoke Role

Grant:

```rs
anchor run grant-role -- <user-pubkey> <role>
/* Example: 
    anchor run grant-role -- GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 verifier
    anchor run grant-role -- 6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT operator
    anchor run grant-role -- ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz organizer
*/
```

Revoke:

```rs
anchor run revoke-role -- <user-pubkey> <role>
/* Example: 
    anchor run revoke-role -- GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 verifier
    anchor run revoke-role -- 6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT operator
    anchor run revoke-role -- ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz organizer
*/
```

##### Approve/Ban Token

Approve:

```rs
anchor run approve-token -- <path-to-operator-keypair> <asset-mint> <minSponsorPool> <minEntryFee>
// Example: anchor run approve-token -- keys/operator.json 6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne 1000 10
```

Ban:

```rs
anchor run ban-token -- <path-to-operator-keypair> <asset-mint>
// Example: anchor run ban-token -- keys/operator.json 6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne
```

##### Create Tournament

Before creating a tournament, you must delegate the sponsor's ATA signing rights to the organizer.

Get sponsor's ATA for tournament token:

```rs
  spl-token address-of --mint <mint-pubkey> --owner <sponsor-pubkey>
  // Example: spl-token address-of --mint 6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne --owner 5RuyKrrBCD6URTNQEujCJn9WEB6ssypaAfGWzbU5tGtX
```

Delegate rights:

```rs
  spl-token approve <sponsor-ata-pubkey> <organizer-pubkey-> 1000000000000 --decimals 9 --owner <path-to-sponsor-keypair>
  // Example: spl-token address 6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne --owner 5RuyKrrBCD6URTNQEujCJn9WEB6ssypaAfGWzbU5tGtX
```

```rs
  anchor run create-tournament -- \
  <organizer-keypair> \
  <sponsor-publickey> \
  <token-publickey> \
  <organizerFee> <sponsorPool> <entryFee> <teamSize> <minTeams> <maxTeams>

  /* Example:
  anchor run create-tournament -- \
  keys/organizer.json \
  5RuyKrrBCD6URTNQEujCJn9WEB6ssypaAfGWzbU5tGtX \
  6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne \
  100 1748736000 1000 200 10 4 10
  */
```

##### Register Tournament

Approve:

```rs
  anchor run register-tournament -- <participant-keypair> <tournamentId> \
  <captain-pubkey> \
  <teammate1> \
  <teammate2> \
  ...

  /* Example:
  anchor run register-tournament -- keys/participant.json 5 \
  9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL \
  FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz
  */
```

##### Start Tournament

Approve:

```rs
  anchor run start-tournament -- <verifier-keypair> <tournamentId>

  /* Example:
    anchor run start-tournament -- keys/verifier.json 0
  */
```

##### Cancel Tournament

Approve:

```rs
  anchor run cancel-tournament -- <verifier-keypair> <tournamentId>

  /* Example:
    anchor run cancel-tournament -- keys/verifier.json 0
  */
```

##### Finish Tournament

Approve:

```rs
  anchor run finish-tournament -- <verifier-keypair> <tournamentId> <winner-pubkey>

  /* Example:
    anchor run finish-tournament -- keys/verifier.json 0 9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL
  */
```

##### Claim Refund

Approve:

```rs
  anchor run claim-refund -- <participant-keypair> <tournamentId> <captain-pubkey>

  /* Example:
    anchor run claim-refund -- keys/participant.json 0 9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL
  */
```

##### Claim Role Fund

Approve:

```rs
  anchor run claim-role-fund -- <claimer-keypair> <amount>

  /* Example:
    anchor run claim-role-fund -- keys/claimer.json 2
  */
```

##### Claim Sponsor Refund

Approve:

```rs
  anchor run claim-sponsor-refund -- <sponsor-keypair> <tournamentId>

  /* Example:
    anchor run claim-sponsor-refund -- keys/sponsor.json 0
  */
```

##### Claim Reward

Approve:

```rs
  anchor run claim-reward -- <participant-keypair> <tournamentId> <captain-pubkey>

  /* Example:
    anchor run claim-reward -- keys/participant.json 0 9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL
  */
```

##### Set Bloom Precision

Approve:

```rs
  anchor run set-bloom-precision -- <admin-keypair> <newPrecision>

  /* Example:
    anchor run set-bloom-precision -- keys/admin.json 50
  */
```

## Omnichain

#### Run the minimal tests suite

```sh
# Run only required tests suite (excluding negative tests)
anchor run test-omni
```

#### Run the whole test suite

```sh
# Run the whole test suite (including negative tests)
anchor run test-omni-all
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
