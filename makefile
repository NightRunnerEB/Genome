KEYS_DIR = keys
SOLANA_KEYGEN = solana-keygen

.PHONY: all keys clean

all: keys

# Generate key pairs
keys:
	mkdir -p $(KEYS_DIR)
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/admin.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/deployer.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/organizer.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/sponsor.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/genome.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/token.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/captain.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/participant_1.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/participant_2.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/participant_3.json

# Clean up generated keys
clean:
	rm -rf $(KEYS_DIR)

