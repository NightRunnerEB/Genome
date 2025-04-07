FROM ubuntu:24.04
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libssl-dev \
    pkg-config \
    libudev-dev llvm libclang-dev \
    ca-certificates protobuf-compiler libssl-dev netcat-traditional \
    nodejs npm

RUN npm install -g yarn
    
ENV PATH="/root/.local/share/solana/install/active_release/bin:/root/.cargo/bin:/root/.nvm/versions/node/v23.10.0/lib/node_modules/ts-mocha:/root/.nvm/versions/node/v23.10.0/bin:$PATH"

RUN curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
RUN export PATH="/root/.cargo/bin:$PATH" && cargo install --git https://github.com/coral-xyz/anchor avm --force

WORKDIR /app
COPY . .
RUN yarn install
RUN npm install -g ts-mocha
RUN export PATH="/root/.cargo/bin:$PATH" && export PATH="/root/.local/share/solana/install/active_release/bin:$PATH" && anchor build

RUN chmod +x /app/run_tests.sh
CMD ["bash", "/app/scripts/run_tests.sh"]
