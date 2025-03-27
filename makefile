KEYS_DIR = keys
SOLANA_KEYGEN = solana-keygen

.PHONY: all keys clean

all: keys

# Generate key pairs
keys:
	mkdir -p $(KEYS_DIR)
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/admin.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/organizer.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/sponsor.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/token.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/verifier1.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/verifier2.json
	$(SOLANA_KEYGEN) new --outfile $(KEYS_DIR)/verifier3.json

# Clean up generated keys
clean:
	rm -rf $(KEYS_DIR)

