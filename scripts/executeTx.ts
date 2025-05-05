import { ethers } from 'hardhat';
import { MultiSigWallet } from '../typechain-types';

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const multiSigAddress = args[0];
  const destinationContract = args[1];
  const value = args[2];
  const data = args[3];
  const signatures = args.slice(4); // Array of signatures

  // Get the MultiSigWallet contract instance
  const multiSigWallet = (await ethers.getContractAt(
    'MultiSigWallet',
    multiSigAddress,
  )) as MultiSigWallet;

  // Execute the transaction
  const tx = await multiSigWallet.executeTransaction(destinationContract, value, data, signatures);

  console.log('Transaction submitted:', tx.hash);

  // Wait for the transaction to be mined
  const receipt = await tx.wait();

  console.log('Transaction executed successfully!');
  console.log('Transaction receipt:', receipt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
