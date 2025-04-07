#!/bin/bash

solana-test-validator --reset --quiet --bpf-program keys/genome-program.json target/deploy/genome_solana.so &

echo "Waiting for solana-test-validator..."
while ! nc -z 127.0.0.1 8899; do
  sleep 1
done

yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/genomeOmni.test.ts
