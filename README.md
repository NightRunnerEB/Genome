# Genome Solana Tournament Platform

## About

### Overview

Genome is a decentralized platform built on Solana for creating, managing, and participating in team-based tournaments. The platform enables organizers to create tournaments, participants to register, and leverages decentralized consensus from trusted verifiers for state transitions such as starting, canceling, or finishing tournaments.

**Key functionalities include:**

- **Platform Initialization:**  
  - The owner configures the platform by setting up parameters in the `GenomeConfig`.
- **Grant/Revoke Role**  
  - The platform admin assigns roles to users using the grant_role instruction. Roles can be Verifier, Operator, or Organizer.
  - Conversely, the revoke_role instruction allows the admin to remove a user’s role; in the case of verifiers, their address is removed from the configuration.
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

Creating a Genome token:

```sh
spl-token create-token -u <network> <path-to-nome-keypair>
# Example: spl-token create-token -u localhost keys/nome.json
```

Setting up wallets:

```sh
anchor run setup-genome -- \
  <deployer-pubkey> \
  <verifier1-pubkey> \
  <verifier2-pubkey> \
  <verifier3-pubkey> \
  <operator-pubkey> \
  <admin-pubkey> \
  <organizer-pubkey>
```

Example: 
  anchor run setup-genome -- \
  HCoTZ78773EUD6EjAgAdAD9mNF3sEDbsW9KGAvUPGEU7 \
  FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
  9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL \
  GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 \
  6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT \
  4LZ7rPVF6jDEwjNsvTYjUNc3qPC6rW6qzoGbAJHGcBeB \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz

Initialize Genome Program

```sh
anchor run initialize -- \
<path-to-deplyer-keypair> \
<admin-pubkey> \
<platformWallet> \
<tournamentNonce> <platformFee> <minEntryFee> <minSponsorPool> <minTeams> <maxTeams> <falsePrecision> <maxOrganizerFee> \
[
 <verifier1>, 
 <verifier2>, 
 ..
]

Example:
anchor run initialize -- \
keys/deployer.json \
4LZ7rPVF6jDEwjNsvTYjUNc3qPC6rW6qzoGbAJHGcBeB \
9z5qaNHxpNWU6XMJFF4pKeA27MnVqVr7HYdAXZsPZSAe \
1 10 10 0 2 20 0.000065 5000 \
FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL
```

### Grant/Revoke Role

Grant:

```sh
anchor run grant-role -- <path-to-admin-keypair> <user-pubkey> <role>
#Example: anchor run grant-role -- keys/admin.json GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 verifier
```

Revoke:

```sh
anchor run revoke-role -- <path-to-admin-keypair> <user-pubkey>
#Example: anchor run revoke-role -- keys/admin.json GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7
```
