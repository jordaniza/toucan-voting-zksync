# zkSync Hardhat project template

## Notes

This repo combines elements of the layerZero V2 hardhat template and the ZkSync hardhat template. Please use with caution as there are a number of gotchas to be aware of, as of time of writing.

In this case:

- The bun package manager does not work for zkSync for some reason. I haven't tested pnpm and yarn but npm works.
- Ethers V6 is not supported by LayerZero.
- There are some hard dependency errors that mandate the user of `npm i --force`. Be careful when using OpenZeppelin libraries especially that the version you're using has the features you need. ZkSync mandates OZ 4.6.0 but on review I couldn't understand why so I forced 4.9.6 which is what we use in our foundry repo.
- You'll need to adapt the test examples in the OFT/OApp docs to fit the zkSync/ethers workflows.

**Specific to Aragon Toucan Voting:**

- Copy the code from the foundry repo
- Run `remappings.sh` to replace foundry remappings
- Remove any test files or references to test files. Obviously forge-std and derivatives are not supported here.
- One nice thing about hardhat: you can specify multiple compiler versions which is a huge help.

This project was scaffolded with [zksync-cli](https://github.com/matter-labs/zksync-cli).

## Project Layout

- `/contracts`: Contains solidity smart contracts.
- `/deploy`: Scripts for contract deployment and interaction.
- `/test`: Test files.
- `hardhat.config.ts`: Configuration settings.

## How to Use

- `npm run compile`: Compiles contracts.
- `npm run deploy`: Deploys using script `/deploy/deploy.ts`.
- `npm run interact`: Interacts with the deployed contract using `/deploy/interact.ts`.
- `npm run test`: Tests the contracts.

Note: Both `npm run deploy` and `npm run interact` are set in the `package.json`. You can also run your files directly, for example: `npx hardhat deploy-zksync --script deploy.ts`

### Environment Settings

To keep private keys safe, this project pulls in environment variables from `.env` files. Primarily, it fetches the wallet's private key.

Rename `.env.example` to `.env` and fill in your private key:

```
WALLET_PRIVATE_KEY=your_private_key_here...
```

### Network Support

`hardhat.config.ts` comes with a list of networks to deploy and test contracts. Add more by adjusting the `networks` section in the `hardhat.config.ts`. To make a network the default, set the `defaultNetwork` to its name. You can also override the default using the `--network` option, like: `hardhat test --network dockerizedNode`.

### Local Tests

Running `npm run test` by default runs the [zkSync In-memory Node](https://era.zksync.io/docs/tools/testing/era-test-node.html) provided by the [@matterlabs/hardhat-zksync-node](https://era.zksync.io/docs/tools/hardhat/hardhat-zksync-node.html) tool.

Important: zkSync In-memory Node currently supports only the L2 node. If contracts also need L1, use another testing environment like Dockerized Node. Refer to [test documentation](https://era.zksync.io/docs/tools/testing/) for details.

## Useful Links

- [Docs](https://era.zksync.io/docs/dev/)
- [Official Site](https://zksync.io/)
- [GitHub](https://github.com/matter-labs)
- [Twitter](https://twitter.com/zksync)
- [Discord](https://join.zksync.dev/)

## License

This project is under the [MIT](./LICENSE) license.
