import { ethers } from 'hardhat';
import { MultiSigWallet, ERC20Mock } from '../typechain-types';

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const operation = args[0]; // 'transfer' or 'addSigner' or 'removeSigner'

  // Get the MultiSigWallet contract instance
  const multiSigWallet = (await ethers.getContractAt('MultiSigWallet', args[1])) as MultiSigWallet;

  if (operation === 'transfer') {
    // Generate transfer transaction
    const tokenAddress = args[2];
    const recipient = args[3];
    const amount = ethers.parseEther(args[4]);

    const erc20Mock = (await ethers.getContractAt('ERC20Mock', tokenAddress)) as ERC20Mock;
    const data = erc20Mock.interface.encodeFunctionData('transfer', [recipient, amount]);

    const nonce = await multiSigWallet.nonce();
    const txHash = await multiSigWallet.getTransactionHash(
      tokenAddress,
      0,
      data,
      nonce + BigInt(1),
    );

    console.log('Transaction Hash:', txHash);
    console.log('Transaction Data:', {
      destinationContract: tokenAddress,
      value: 0,
      data: data,
      nonce: nonce + BigInt(1),
    });
  } else if (operation === 'addSigner') {
    // Generate add signer transaction
    const newSigner = args[2];
    const newThreshold = parseInt(args[3]);

    const data = multiSigWallet.interface.encodeFunctionData('addSignerAndUpdateThreshold', [
      newSigner,
      newThreshold,
    ]);

    const nonce = await multiSigWallet.nonce();
    const txHash = await multiSigWallet.getTransactionHash(
      await multiSigWallet.getAddress(),
      0,
      data,
      nonce + BigInt(1),
    );

    console.log('Transaction Hash:', txHash);
    console.log('Transaction Data:', {
      destinationContract: await multiSigWallet.getAddress(),
      value: 0,
      data: data,
      nonce: nonce + BigInt(1),
    });
  } else if (operation === 'removeSigner') {
    // Generate remove signer transaction
    const signerToRemove = args[2];
    const newThreshold = parseInt(args[3]);

    const data = multiSigWallet.interface.encodeFunctionData('removeSigner', [
      signerToRemove,
      newThreshold,
    ]);

    const nonce = await multiSigWallet.nonce();
    const txHash = await multiSigWallet.getTransactionHash(
      await multiSigWallet.getAddress(),
      0,
      data,
      nonce + BigInt(1),
    );

    console.log('Transaction Hash:', txHash);
    console.log('Transaction Data:', {
      destinationContract: await multiSigWallet.getAddress(),
      value: 0,
      data: data,
      nonce: nonce + BigInt(1),
    });
  } else {
    console.error("Invalid operation. Use 'transfer' or 'addSigner' or 'removeSigner'");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
