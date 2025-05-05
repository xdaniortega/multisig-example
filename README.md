# MultiSig Wallet Example

This project demonstrates a MultiSig wallet implementation with the following features:
- Multiple signers with configurable threshold
- EIP-712 signature verification
- Nonce-based transaction execution
- Signer management (add/remove signers)
- ERC20 token support
- Please, go to the smart contract natSpec comments to see more details.


## Scripts usage

### Fund Wallet
Transfers ERC20 tokens to the MultiSig wallet:
```bash
npx hardhat fund-wallet <multiSigAddress> <tokenAddress> <amount>
```

### Generate Transaction
Generates transaction data and hash for the MultiSig wallet:
```bash
npx hardhat generate-tx <operation> <multiSigAddress> <targetAddress> <param2> <param3>
```

Where:
- `operation`: Type of operation (`transfer`, `addSigners`, `removeSigners`)
- `multiSigAddress`: Address of the MultiSig wallet
- `targetAddress`: Target address (token address for transfer, new signer for add/remove)
- `param2`: Second parameter (recipient for transfer, new threshold for add/remove)
- `param3`: Third parameter (amount for transfer, not used for add/remove)

Examples:
```bash
# Transfer tokens
npx hardhat generate-tx transfer <multiSigAddress> <tokenAddress> <recipientAddress> <amount>

# Add a new signer
npx hardhat generate-tx addSigners <multiSigAddress> <newSignerAddress> <newThreshold> 0

# Remove a signer
npx hardhat generate-tx removeSigners <multiSigAddress> <signerToRemove> <newThreshold> 0
```

### Sign Transaction
Signs a transaction hash with a specific signer:
```bash
npx hardhat sign-tx <txHash> <signerIndex>
```

### Execute Transaction
Executes a signed transaction:
```bash
npx hardhat execute-tx <multiSigAddress> <destinationContractAddress> <value> <data> <nonce> <signatures>
```

Where:
- `multiSigAddress`: Address of the MultiSig wallet
- `destinationContractAddress`: Address of the contract to execute the transaction on
- `value`: ETH value to send (in wei)
- `data`: Transaction data (from generate-tx)
- `nonce`: Next nonce to use (from generate-tx)
- `signatures`: Comma-separated list of signatures (from sign-tx)

### Check Balance
Gets the ERC20 token balance for an address:
```bash
npx hardhat balance <tokenAddress> <address>
```

### Get Signers
Gets the current signers and threshold of the MultiSig wallet:
```bash
npx hardhat getSigners <multiSigAddress>
```

## Workflow Example
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


1. Fund the MultiSig wallet:
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

2. Generate a transaction to transfer tokens:
```bash
npx hardhat generate-tx transfer 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 50 --network localhost
```

Expected output:
```
Transaction Hash (what has to be signed): 0xc600f8bb8cfed0ddf18f9bfaf805eb162b81f47eb7f0c731420225c1db6dbe13
Transaction Data (what we want to execute): 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000
```

3. Sign the transaction with required signers:
```bash
npx hardhat sign-tx 0xc600f8bb8cfed0ddf18f9bfaf805eb162b81f47eb7f0c731420225c1db6dbe13 0
```

Expected output:
```
Original Hash: 0xc600f8bb8cfed0ddf18f9bfaf805eb162b81f47eb7f0c731420225c1db6dbe13
Signature: 0x94efa66c68dccfa9fe244c5e0adfcce84d3883db843826278723e2710b9b013a4d41419b840fa7155a60c2ef067af3894b2d7b3881ddfae88ee77fb700b780021c
Signer Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Signer Index: 0
```

Do the same with index 1 to get signature 1.

```bash
npx hardhat sign-tx 0xc600f8bb8cfed0ddf18f9bfaf805eb162b81f47eb7f0c731420225c1db6dbe13 1
```

Expected output:
```
Original Hash: 0xc600f8bb8cfed0ddf18f9bfaf805eb162b81f47eb7f0c731420225c1db6dbe13
Signature: 0x2754eb447ce24c169f90cfd949bd1e67ab2fe8cc93823bba7e5958be6b5cc15175a6f53d619abee5396626fcd5567c81479cd65a46e24b9ccc769f93f931ff591b
Signer Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Signer Index: 1
```

4. Execute the transaction:
```bash
npx hardhat execute-tx 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x5FbDB2315678afecb367f032d93F642f64180aa3 0 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000 0x94efa66c68dccfa9fe244c5e0adfcce84d3883db843826278723e2710b9b013a4d41419b840fa7155a60c2ef067af3894b2d7b3881ddfae88ee77fb700b780021c,0x2754eb447ce24c169f90cfd949bd1e67ab2fe8cc93823bba7e5958be6b5cc15175a6f53d619abee5396626fcd5567c81479cd65a46e24b9ccc769f93f931ff591b --network localhost
```

Expected output:
```
Transaction Details:
MultiSig Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Destination Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Value: 0
Data: 0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8000000000000000000000000000000000000000000000002b5e3af16b1880000
Nonce: 01
Number of signatures: 2
Signatures: [
  '0x94efa66c68dccfa9fe244c5e0adfcce84d3883db843826278723e2710b9b013a4d41419b840fa7155a60c2ef067af3894b2d7b3881ddfae88ee77fb700b780021c',
  '0x2754eb447ce24c169f90cfd949bd1e67ab2fe8cc93823bba7e5958be6b5cc15175a6f53d619abee5396626fcd5567c81479cd65a46e24b9ccc769f93f931ff591b'
]
Transaction submitted: 0x4fb938894afe6821d0e56a533d763e3bea7ab821238bf3d18225b5a5e326a181
Transaction status: Success
```

5. Verify the balance:
Check MultiSig Wallet balance:
```bash
npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --network localhost
```

Expected output:
```
Balance for 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512: 50.0 tokens
```

Check recipient balance:
```bash
npx hardhat balance 0x5FbDB2315678afecb367f032d93F642f64180aa3 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --network localhost
```

Expected output:
```
Balance for 0x70997970C51812dc3A010C7d01b50e0d17dc79C8: 50.0 tokens
```

## Managing Signers

### Removing a Signer

1. Generate the transaction to remove a signer:
```bash
npx hardhat generate-tx removeSigners 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 1 --network localhost
```

Expected output:
```
Transaction Details:
Operation: removeSigners
Current Nonce: 1
Next Nonce: 2
Transaction Hash (what has to be signed): 0xfe449f4fd7578ee6f3ae9df42a45f7b339234ebfc6312f405392f3f2df27a52e
Transaction Data (what we want to execute): 0xd059f7460000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001
```

2. Sign the transaction with two different signers (similar to transfer example)

```bash
npx hardhat sign-tx 0xfe449f4fd7578ee6f3ae9df42a45f7b339234ebfc6312f405392f3f2df27a52e 0
```

Expected output:
```
Original Hash: 0xfe449f4fd7578ee6f3ae9df42a45f7b339234ebfc6312f405392f3f2df27a52e
Signature: 0x2ad097d230f0cf085ea8d29e6b06da21816a10ca9e4ecad8151c52ca0c06913b6dd9d5734bb7667e96bf0f39f6e82d9d4a9454f4383a408849e405786b9e4a131c
Signer Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Signer Index: 0
```

```bash
npx hardhat sign-tx 0xfe449f4fd7578ee6f3ae9df42a45f7b339234ebfc6312f405392f3f2df27a52e 1
```

Expected output:
```
Original Hash: 0xfe449f4fd7578ee6f3ae9df42a45f7b339234ebfc6312f405392f3f2df27a52e
Signature: 0x8b3c4eeeaff70f6bde3048f6d56d6957d4d1a8d951296242bdd22ba9ebcdccdf6efcebbb61b1527cd2646dfd34879dd3a07a3aa488ee45a56f221c434a6a4b571c
Signer Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Signer Index: 1
```

3. Execute the transaction:
```bash
npx hardhat execute-tx 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0 0xd059f7460000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001 0x2ad097d230f0cf085ea8d29e6b06da21816a10ca9e4ecad8151c52ca0c06913b6dd9d5734bb7667e96bf0f39f6e82d9d4a9454f4383a408849e405786b9e4a131c,0x8b3c4eeeaff70f6bde3048f6d56d6957d4d1a8d951296242bdd22ba9ebcdccdf6efcebbb61b1527cd2646dfd34879dd3a07a3aa488ee45a56f221c434a6a4b571c --network localhost
```

4. Verify the signer was removed:
```bash
npx hardhat getSigners 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 --network localhost
```

Expected output:
```
Current Signers:
1. 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
2. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Current Threshold: 1
```

### Adding a New Signer

1. Generate the transaction to add a new signer:
```bash
npx hardhat generate-tx addSigners 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 2 --network localhost
```

Expected output:
```
Transaction Details:
Operation: addSigners
Current Nonce: 2
Next Nonce: 3
Transaction Hash (what has to be signed): 0x61096374db33d6d7c446efe438e08cd6fd0b218c9e5f35842a72e17d6bb33d49
Transaction Data (what we want to execute): 0xd059f7460000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002
```

2. Sign the transaction with one signer
```bash
npx hardhat sign-tx 0x61096374db33d6d7c446efe438e08cd6fd0b218c9e5f35842a72e17d6bb33d49 0
```

Expected output:
```
Original Hash: 0x61096374db33d6d7c446efe438e08cd6fd0b218c9e5f35842a72e17d6bb33d49
Signature: 0xc88881dd2c01a346846e149381124a2973e90143167501c3c6f91ba8f69b314a2e95b017b722f06d4bc25315732b119b37d4fb7c9163132cebaf0cce98c316501b
Signer Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Signer Index: 0
```
3. Execute the transaction:
```bash
npx hardhat execute-tx 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 0 0xd059f7460000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002 0xc88881dd2c01a346846e149381124a2973e90143167501c3c6f91ba8f69b314a2e95b017b722f06d4bc25315732b119b37d4fb7c9163132cebaf0cce98c316501b  --network localhost
```

Expected output:

```
Transaction Details:
MultiSig Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Destination Contract: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
Value: 0
Data: 0xd059f7460000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002
Nonce: 3n
Number of signatures: 1
Signatures: [
  '0xc88881dd2c01a346846e149381124a2973e90143167501c3c6f91ba8f69b314a2e95b017b722f06d4bc25315732b119b37d4fb7c9163132cebaf0cce98c316501b'
]
Transaction submitted: 0x15c0fe383210f6eb694164abc8fe2c22737ecb597d16fdc4a1638de52f356ad7
Transaction status: Success
```

4. Verify the new signer was added:
```bash
npx hardhat getSigners 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --network localhost
```

Expected output:
```
Current Signers:
1. 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
2. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
3. 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Current Threshold: 2
```


## Addresses Used in This Process

- MultiSig Wallet: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- ERC20 Token: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Owner/Signer 1: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Recipient/Signer 2: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` 
## Considerations

> ⚠️ **WARNING**: Please for smart contract in depth explanation, go to the desired contract and check comments.
