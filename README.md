# Burn Cardano Native Tokens

This repository hosts a Cardano smart contract designed to “burn”
Cardano native tokens (CNTs). CNTs sent to this smart contract are
forever locked, permanently removing them from circulating supply.

## Prerequisites

  - [node](https://nodejs.org/download/release/v18.18.1/)
  - [Aiken](https://aiken-lang.org/installation-instructions)
  - [local-vault](https://github.com/MynthAI/local-vault)

## Testing

To run Aiken unit tests:

``` sh
npm run test:aiken
```

To run integration tests:

``` sh
npm run test
```

## Deploying

This script can be deployed as a Cardano reference script. To deploy,
run:

``` sh
npx tsx offchain/entrypoints/deploy.ts
```

During this process you’ll need a Cardano wallet funded with ADA and one
token you’d like to burn. After running this script, a `cnt-burn.json`
file will be generated. This file can be passed into off-chain functions
to burn tokens.

## Usage

For burning tokens, the `npx burn` CLI can be used.

## Setting Up Vault Secrets

This project utilizes Vault for secure storage of secrets. To set it up
on your computer, follow the steps provided on the [Local
Vault](https://github.com/MynthAI/local-vault) page.

The list of secrets this repository relies on are:

  - `cnt-burn/blockfrost api_key`
  - `cnt-burn/wallets seed1`

`cnt-burn/wallets seed1` is used only for testing purposes. If you need
to run tests locally, contact a Mynth team member to obtain the value.
