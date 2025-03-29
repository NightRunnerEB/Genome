# Genome Solana Tournament Platform

## About

### Overview

Genome is a decentralized platform built on Solana for creating, managing, and participating in team-based tournaments. The platform enables organizers to create tournaments, participants to register, and leverages decentralized consensus from trusted agents (verifiers) for state transitions such as starting, canceling, or finishing tournaments.

**Key functionalities include:**

- **Platform Initialization:**  
  - The owner configures the platform by setting up parameters in the `GenomeConfig` (e.g., `platform_fee`, `platform_wallet`, `tournament_nonce`, `min_entry_fee`, `min_sponsor_pool`, `min_teams`, `max_teams`, `max_organizer_fee`).
- **Tournament Creation:**  
  - Organizers create tournaments by providing parameters such as organizer fee, expiration time, entry fee, team size, asset mint, and team limits.
- **Tournament Registration:**  
  - Participants register by either forming a new team (in which case the first registrant becomes the team captain) or by joining an existing team.
- **Tournament Start:**  
  - Each verifier calls the `start_tournament` instruction.  
  - Each call increments a consensus counter in the tournament record. Every agent receives a fee for voting.
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
- Tournament creation validation
- Fund transfers and sponsor pool setup
- Checking the correctness of the results of the instructions

### Known Limitations

- Current tests cover only the `initialize` and `create_tournament` instruction. Additional tests are needed for full feature validation.

---

## Usage

### Setting Up

NOTE: Set the Publickey generated for the admin as a Deployer(lib.rs)
NOTE: Do NOT use any keypairs which were published in gitlab for production

### Run scripts

#### Initialize Genome Program

NOTE: Перед запуском программы необходимо создать токены и настроить все акканты. Это можно сделать следующим способом:

Создание токена турнира

```sh
spl-token create-token -u <network> <path-to-token-keypair>
# Example: spl-token create-token -u localhost keys/token.json
```

Создание genome токена

```sh
spl-token create-token -u <network> <path-to-nome-keypair>
# Example: spl-token create-token -u localhost keys/nome.json
```

Настройка кошельков:

```sh
anchor run setup-genome -- \
  <path-to-authority-keypair> \
  <path-to-payer-keypair> \
  <assetMint> \
  <nomeMint> \
  <sponsor-pubkey> \
  <captain-pubkey> \
  <deployer-pubkey> \
  <verifier1-pubkey> \
  <verifier2-pubkey> \
  <verifier3-pubkey> \
  <operator-pubkey> \
  <admin-pubkey> \
  <organizer-pubkey>

Example: 
  anchor run setup-genome -- \
  /Users/user/.config/solana/id.json \
  /Users/user/.config/solana/id.json \
  6F7Tn3YPcArLG6G2FoKGtkPYrwrQqdJeA7SQ3i5Uy1py \
  Btzv5f2fxbF5FKSjbEhCxkusvdxridtRGwKWkp1C77dJ \
  7NukBTvEvJytba1bjBfTUqeijevxQMkRsmbse894WZMS \
  HNo14Jvj1gQ7D8GCnTrKqe1z9BQbuDw8ZtBAcNB2Ud58 \
  HCoTZ78773EUD6EjAgAdAD9mNF3sEDbsW9KGAvUPGEU7 \
  FcKnp8dCRKUFq3pphgAnw18WKiLKGQPn5zBFWq9ojuLy \
  9B1tCuuw9nSM5tuZPq8TK5N3LC84PMxGf2xvuhFAagqL \
  GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 \
  6Agqn5YD4fAncrnB9VrvwTfaufw2Tx1pphGca79uWruT \
  4LZ7rPVF6jDEwjNsvTYjUNc3qPC6rW6qzoGbAJHGcBeB \
  ERkYz7Dkbj4ZPdZ11BidjHR1A2LfVW1egBskHaWN3ayz
```

Initialize Genome Program

```sh
anchor run initialize -- \
<path-to-deplyer-keypair> \
<admin-pubkey> \
<platformWallet> \
<tournamentNonce> <platformFee> <minEntryFee> <minSponsorPool> <minTeams> <maxTeams> <falsePrecision> <maxOrganizerFee>


Example:
anchor run initialize -- \
keys/deployer.json \
4LZ7rPVF6jDEwjNsvTYjUNc3qPC6rW6qzoGbAJHGcBeB \
9z5qaNHxpNWU6XMJFF4pKeA27MnVqVr7HYdAXZsPZSAe \
1 10 10 0 2 20 0.000065 5000
```

To ensure genomeConfig is set properly

```sh
anchor account genome_contract.GenomeConfig <genomeConfig-address>
# Example: anchor account genome_contract.GenomeConfig JDwp8jxWr1ZTVrij5tRevrcgnfnPF8ZcmYgAYBch7UYb
```

#### Approve/Ban Token

Approve:

```sh
anchor run approve-token -- <path-to-operator-keypair> <asset-mint> <minSponsorPool> <minEntryFee>

#Example: anchor run approve-token -- keys/operator.json 6F7Tn3YPcArLG6G2FoKGtkPYrwrQqdJeA7SQ3i5Uy1py 1000 100
```

Ban:

```sh
anchor run ban-token -- <path-to-operator-keypair> <asset-mint>

#Example: anchor run ban-token -- keys/operator.json 6F7Tn3YPcArLG6G2FoKGtkPYrwrQqdJeA7SQ3i5Uy1py
```

### Grant/Revoke Role

```sh
anchor run grant-role -- <admin-keypair> <user-pubkey> <role>

#Example: anchor run grant-role -- keys/admin.json GVQyxwHxVZBY9PB5hfSf1owN7F8QX4qF4HdurMA3bbr7 verifier
```

#### Create Tournament

```sh
anchor run create-tournament -- \
<organizer-keypair> \
<sponsor-publickey> \
<token-publickey> \
<organizerFee> <sponsorPool> <entryFee> <teamSize> <minTeams> <maxTeams>

# Example:
anchor run create-tournament -- \
keys/organizer.json \
7NukBTvEvJytba1bjBfTUqeijevxQMkRsmbse894WZMS \
6F7Tn3YPcArLG6G2FoKGtkPYrwrQqdJeA7SQ3i5Uy1py \
100 1000 20 10 4 10
```
