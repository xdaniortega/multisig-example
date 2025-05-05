# MultiSigWallet Process Documentation

This document details the complete process of setting up and using the MultiSig Wallet, including all commands and their expected outputs.

## Setup and Initial Deployment


1.  First launch your local node and use the ignition modules to deploy the necessary smart contracts for this use case. We'll deploy the MultiSig Smart Contract Wallet and a mock ERC20 to fund the wallet and test.
```bash
npx hardhat node
```

2. Deploy the ERC20Mock contract:
```bash
npx hardhat ignition deploy ./ignition/modules/ERC20Mock.ts --network localhost
```

3. Now, we'll deploy the MultiSig Wallet, which will take the first 3 signers generated from .env mnemonic phrase and will set the threshold to 2 by default. CLI command arguments could be settled as well but is not part of the deliverable.
```bash
npx hardhat ignition deploy ./ignition/modules/MultiSigWallet.ts --network localhost
```

## Funding the MultiSig Wallet
Now, we need to fund the MultiSig Wallet with ERC20 tokens. Use the `fund-wallet` task to transfer tokens from the owner to the MultiSig Wallet:
Transfer 100 tokens from the owner to the MultiSig Wallet:
```bash
npx hardhat fund-wallet 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 100 --network localhost
```

Expected output:
```
Owner address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Owner token balance before: 1000.0 tokens
MultiSigWallet token balance before: 0.0 tokens

Transaction completed!

Owner token balance after: 900.0 tokens
MultiSigWallet token balance after: 100.0 tokens
```

## Generating a Transaction

Generate a transaction to transfer 50 tokens to another address:
```bash
npx hardhat generate-tx transfer 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 50 --network localhost
```

Expected output:
```
Transaction Hash (what has to be signed): 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26
Transaction Data (what we want to execute): 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000
```

## Signing the Transaction

Sign the transaction with two different signers:

1. First signer:
```bash
npx hardhat sign-tx 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26 0
```

Expected output:
```
Original Hash: 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26
Signature: 0x53c8ebb939853653eeca9650956a800ca37fe22e7eea684faccfe83a5718f9a30691feeb814d3a03172aeb064b1264273b9b70bf3b003f4a613fc7bf7535d06d1c

0x24b6d3d566f8c441f36456807120a79dcdc79416b0820e6a30aff6f9ceb75337219e73be38ff4e496bfe07345688f74d3524f088ce794823741a1ad3c4eadbdb1c
Signer Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Signer Index: 0
```

2. Second signer:
```bash
npx hardhat sign-tx 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26 1
```

Expected output:
```
Original Hash: 0x8aba7c968b13713c508db220b128b642ebb021b3fba6d70a8777b831f2ab5d26
Signature: 0x9667689e32fa7f5634962c3ab3810cb403c5d15c02b3b2a84314d935d8022e62691ddf6e26bd5222531b1fc06968f01e4bf6eb6084a88a04d1522221311a884f1b

0xc9e39948daaff2066a384d1d18cbe7136da9d03b9c144e47c657e7b805232a1e3e5d03308ac58e21be7cb4a60b9dbf8765440915bf1513ab658c50f77b8e5b3d1b
Signer Address: 0x70997970C51812dc3A010C7d01b50e0d17d
```

## Executing the Transaction

Execute the transaction with both signatures:
```bash
npx hardhat execute-tx 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000 0x24b6d3d566f8c441f36456807120a79dcdc79416b0820e6a30aff6f9ceb75337219e73be38ff4e496bfe07345688f74d3524f088ce794823741a1ad3c4eadbdb1c,0xc9e39948daaff2066a384d1d18cbe7136da9d03b9c144e47c657e7b805232a1e3e5d03308ac58e21be7cb4a60b9dbf8765440915bf1513ab658c50f77b8e5b3d1b --network localhost
```

Expected output:
```
Transaction Details:
MultiSig Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Destination Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Value: 0
Data: 0xa9059cbb00000000000000000000000070997970c51812dc3A010C7d01b50e0d17dc79c8000000000000000000000000000000000000000000000000002b5e3af16b1880000
Number of signatures: 2
Signatures: [
  "0x24b6d3d566f8c441f36456807120a79dcdc79416b0820e6a30aff6f9ceb75337219e73be38ff4e496bfe07345688f74d3524f088ce794823741a1ad3c4eadbdb1c",
  "0xc9e39948daaff2066a384d1d18cbe7136da9d03b9c144e47c657e7b805232a1e3e5d03308ac58e21be7cb4a60b9dbf8765440915bf1513ab658c50f77b8e5b3d1b"
]
Transaction submitted: 0x8d575b351a719defdc77de1a2e2711d0e5704331a024e28ee6633fecf71d5114
Transaction status: Success
```

## Verifying Balances

1. Check MultiSig Wallet balance:
```bash
npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --network localhost
```

Expected output:
```
Balance for 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512: 50.0 tokens
```

2. Check recipient balance:
```bash
npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --network localhost
```

Expected output:
```
Balance for 0x70997970C51812dc3A010C7d01b50e0d17dc79C8: 50.0 tokens
```

## Addresses Used in This Process

- MultiSig Wallet: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- ERC20 Token: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Owner/Signer 1: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Recipient/Signer 2: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` 
## Considerations

> ⚠️ **WARNING**: Please for smart contract in depth explanation, go to the desired contract and check comments.
