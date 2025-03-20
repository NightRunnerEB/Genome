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
    npm install
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

Before running the program, generate the necessary keypairs:

```sh
mkdir -p keys
solana-keygen new --outfile keys/admin.json
solana-keygen new --outfile keys/organizer.json
solana-keygen new --outfile keys/sponsor.json
solana-keygen new --outfile keys/token.json
solana-keygen new --outfile keys/captain.json
solana-keygen new --outfile keys/participant_1.json
solana-keygen new --outfile keys/participant_2.json
solana-keygen new --outfile keys/participant_3.json
```

Set the Publickey generated for the admin as a Deployer(lib.rs)
You can get this key by calling the command:

```sh
solana address -k keys/admin.json
```
