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

### Running Tests

To run tests, use the following command:

1. Install dependencies:

    ```sh
    yarn install
    ```

2. Run the test suite:

    ```sh
    anchor test
    ```

### Test Coverage

The test suite covers:

- Initializing GenomeConfig
- Role Management

### Known Limitations

- Current tests cover only the `initialize` and `grant/revoke role` instruction

---

## Usage

### Setting Up

NOTE: Set the Publickey generated for the admin as a Deployer(lib.rs)
NOTE: Do NOT use any keypairs which were published in gitlab for production

### Run scripts

#### Initialize Genome Program

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

```rs
anchor run setup-wallets -- \
  <path-to-authority-keypair> \
  <path-to-payer-keypair> \
  <path-to-sponsor-keypair> \
  <assetMint> \
  <nomeMint> \
  <verifier1-pubkey> \
  <verifier2-pubkey> \
  <operator-pubkey> \
  <organizer-pubkey> \
  <platform-pubkey> \

/* Example: 
  anchor run setup-wallets -- \
  /Users/evgeniybukharev/.config/solana/id.json \
  /Users/evgeniybukharev/.config/solana/id.json \
  keys/sponsor.json \
  6bNsgK8TZEebYPyGaK9Lm2TNjomzCTYPHq7SGjR7uQne \
  Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ \
  FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
  9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL \
  6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz \
  9z5qaNHxpNWU6XMJFF4pKeA27MnVqVr7HYdAXZsPZSAe
  */
```

Initialize Genome Program

```rs
anchor run initialize -- \
<tournamentNonce> <platformFee> <minTeams> <maxTeams> <falsePrecision> <maxOrganizerFee> \
<platformWallet-pubkey> \
<nome-pubkey> \

/* Example:
    anchor run initialize -- \
    1 10 2 20 0.000065 5000 66.0 \
    9z5qaNHxpNWU6XMJFF4pKeA27MnVqVr7HYdAXZsPZSAe \
    Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ
*/
```

### Grant/Revoke Role

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

#### Approve/Ban Token

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

#### Create Tournament

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
