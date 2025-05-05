import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const txHash = args[0];
  const signerIndex = parseInt(args[1] || '0'); // Default to first signer if not specified

  if (!process.env.MNEMONIC) {
    throw new Error('Please set MNEMONIC in your .env file');
  }

  // Create a wallet instance from the mnemonic
  const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC, ethers.provider);
  const signer = wallet.deriveChild(signerIndex);

  // Sign the transaction hash
  const signature = await signer.signMessage(ethers.getBytes(txHash));

  console.log('Signature:', signature);
  console.log('Signer Address:', signer.address);
  console.log('Signer Index:', signerIndex);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
