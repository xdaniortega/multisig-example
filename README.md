# MultiSigWallet InteropLabs

## Setup

First launch your local node and use the ignition modules to deploy the necessary smart contracts for this use case. We'll deploy the MultiSig Smart Contract Wallet and a mock ERC20 to fund the wallet and test.

```shell
npx hardhat node
```

```shell
npx hardhat ignition deploy ./ignition/modules/ERC20Mock.ts --network localhost
```

Now, we'll deploy the MultiSig Wallet, which will take the first 3 signers generated from .env mnemonic phrase and will set the threshold to 2 by default. CLI command arguments could be settled as well but is not part of the deliverable.

```shell
npx hardhat ignition deploy ./ignition/modules/MultiSigWallet.ts --network localhost
```

Now, we need to fund the MultiSig Wallet with ERC20 tokens. Use the `fund-wallet` task to transfer tokens from the owner to the MultiSig Wallet:

```bash
# Format
npx hardhat fund-wallet <multiSigAddress> <tokenAddress> <amount> --network localhost

# Example
npx hardhat fund-wallet 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 100 --network localhost
```

## Tasks

### 1. Generate Transaction (`generate-tx`)

Generates transaction data and hash for either a token transfer or signer management.

```bash
# Format for token transfer
npx hardhat generate-tx transfer <multiSigAddress> <tokenAddress> <recipientAddress> <amount> --network localhost

# Format for adding signers
npx hardhat generate-tx addSigners <multiSigAddress> <newSignerAddress> <newThreshold> --network localhost

# Format for removing signers
npx hardhat generate-tx removeSigners <multiSigAddress> <signerToRemove> <newThreshold> --network localhost

# Example
npx hardhat generate-tx transfer 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 50 --network localhost
```

### 2. Sign Transaction (`sign-tx`)

Signs a transaction hash using a signer from your Hardhat network.

```bash
# Format
npx hardhat sign-tx <txHash> [signerIndex]

# Example
npx hardhat sign-tx 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26 0  # Uses first signer
npx hardhat sign-tx 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26 1  # Uses second signer
```

### 3. Execute Transaction (`execute-tx`)

Executes a transaction with collected signatures.

```bash
# Format
npx hardhat execute-tx <multiSigAddress> <destinationContract> <value> <data> <signature1,signature2,...> --network localhost

# Example
npx hardhat execute-tx 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000 0x24b6d3d566f8c441f36456807120a79dcdc79416b0820e6a30aff6f9ceb75337219e73be38ff4e496bfe07345688f74d3524f088ce794823741a1ad3c4eadbdb1c,0xc9e39948daaff2066a384d1d18cbe7136da9d03b9c144e47c657e7b805232a1e3e5d03308ac58e21be7cb4a60b9dbf8765440915bf1513ab658c50f77b8e5b3d1b
```

Check succesfull transacion details and also fetch balances:
```bash
npx hardhat balance <tokenAddress> <address> --network localhost
```

With the following command multiSig wallet balance should be 50 ERC20 units.
```bash
# Example
npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --network localhost
```

And user balance should be 50 ERC20 units.

npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --network localhost
```

## Considerations

> ⚠️ **WARNING**: Please for smart contract in depth explanation, go to the desired contract and check comments.
