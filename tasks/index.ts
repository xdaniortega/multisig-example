import { task } from 'hardhat/config';
import { ethers } from 'hardhat';
import { ERC20Mock } from '../typechain-types';

task('fund-wallet', 'Transfers ERC20 tokens to a MultiSig wallet')
  .addPositionalParam('destinationAddress', 'MultiSig wallet address')
  .addPositionalParam('tokenAddress', 'ERC20 token address')
  .addPositionalParam('amount', 'Amount of tokens to transfer')
  .setAction(async (taskArgs, hre) => {
    const [owner] = await hre.ethers.getSigners();
    const erc20Mock = (await hre.ethers.getContractAt('ERC20Mock', taskArgs.tokenAddress)) as ERC20Mock;
    console.log('Owner address:', owner.address);

    // Get token balances before
    const ownerBalanceBefore = await erc20Mock.balanceOf(owner.address);
    const multiSigBalanceBefore = await erc20Mock.balanceOf(taskArgs.destinationAddress);

    console.log('Owner token balance before:', hre.ethers.formatEther(ownerBalanceBefore), 'tokens');
    console.log(
      'MultiSigWallet token balance before:',
      hre.ethers.formatEther(multiSigBalanceBefore),
      'tokens',
    );

    // Send tokens to MultiSigWallet
    const tx = await erc20Mock.connect(owner).transfer(taskArgs.destinationAddress, hre.ethers.parseEther(taskArgs.amount));
    const receipt = await tx.wait();

    console.log('\nTransaction completed!');

    // Get token balances after
    const ownerBalanceAfter = await erc20Mock.balanceOf(owner.address);
    const multiSigBalanceAfter = await erc20Mock.balanceOf(taskArgs.destinationAddress);

    console.log('Owner token balance after:', hre.ethers.formatEther(ownerBalanceAfter), 'tokens');
    console.log(
      'MultiSigWallet token balance after:',
      hre.ethers.formatEther(multiSigBalanceAfter),
      'tokens',
    );
  });

task('generate-tx', 'Generates transaction data for the MultiSig')
  .addPositionalParam('operation', 'Operation to perform (transfer, addSigners, removeSigners)')
  .addPositionalParam('multiSigAddress', 'Address of the MultiSig wallet')
  .addPositionalParam('targetAddress', 'Target address (token address for transfer, new signer for add/remove)')
  .addPositionalParam('param2', 'Second parameter (recipient for transfer, new threshold for add/remove)')
  .addPositionalParam('param3', 'Third parameter (amount for transfer, not used for add/remove)')
  .setAction(async (taskArgs, hre) => {
    const { operation, multiSigAddress, targetAddress, param2, param3 } = taskArgs;
    const multiSigWallet = await hre.ethers.getContractAt('MultiSigWallet', multiSigAddress);
    const erc20Mock = await hre.ethers.getContractAt('ERC20Mock', targetAddress);

    let data: string;
    let destination: string;

    if (operation === 'transfer') {
      const transferAmount = hre.ethers.parseEther(param3);
      data = erc20Mock.interface.encodeFunctionData('transfer', [param2, transferAmount]);
      destination = await erc20Mock.getAddress();
    } else if (operation === 'addSigners' || operation === 'removeSigners') {
      data = multiSigWallet.interface.encodeFunctionData('updateSignerSet', [
        param2,
        operation === 'addSigners',
        param3
      ]);
      destination = multiSigAddress;
    } else {
      throw new Error('Invalid operation. Use: transfer, addSigners, or removeSigners');
    }

    const currentNonce = await multiSigWallet.nonce();
    const nextNonce = currentNonce + BigInt(1);
    const value = hre.ethers.parseEther('0');
    const txHash = await multiSigWallet.getTransactionHash(destination, value, data, nextNonce);

    console.log('\nTransaction Details:');
    console.log('Operation:', operation);
    console.log('Current Nonce:', currentNonce.toString());
    console.log('Next Nonce:', nextNonce.toString());
    console.log('Transaction Hash (what has to be signed):', txHash);
    console.log('Transaction Data (what we want to execute):', data);
  });

task('sign-tx', 'Signs a MultiSig transaction')
  .addPositionalParam('txHash', 'Transaction hash to sign')
  .addPositionalParam('signerIndex', 'Index of the signer to use (default: 0)', '0')
  .setAction(async (taskArgs, hre) => {
    const { txHash, signerIndex } = taskArgs;
    const signers = await hre.ethers.getSigners();
    const signer = signers[parseInt(signerIndex)];

    // Convert hash to bytes and sign
    const hashBytes = hre.ethers.getBytes(txHash);
    const signature = await signer.signMessage(hashBytes);

    console.log('Original Hash:', txHash);
    console.log('Signature:', signature);
    console.log('Signer Address:', signer.address);
    console.log('Signer Index:', signerIndex);
  });

task('execute-tx', 'Executes a signed MultiSig transaction')
  .addPositionalParam('destinationAddress', 'MultiSig wallet address')
  .addPositionalParam('destinationContractAddress', 'Destination contract address')
  .addPositionalParam('value', 'ETH value to send')
  .addPositionalParam('data', 'Transaction data')
  .addPositionalParam('signatures', 'Comma-separated signatures')
  .setAction(async (taskArgs, hre) => {
    const { destinationAddress, destinationContractAddress, value, data, signatures } = taskArgs;
    const multiSigWallet = await hre.ethers.getContractAt('MultiSigWallet', destinationAddress);

    // Convert value to BigInt for consistency
    const _value = BigInt(value);

    // Parse signatures
    const signatureArray = signatures.split(',').map((sig: string) => sig.trim());
    
    console.log('Transaction Details:');
    console.log('MultiSig Address:', destinationAddress);
    console.log('Destination Contract:', destinationContractAddress);
    console.log('Value:', _value.toString());
    console.log('Data:', data);
    console.log('Nonce:',(await multiSigWallet.nonce())+1n);
    console.log('Number of signatures:', signatureArray.length);
    console.log('Signatures:', signatureArray);

    try {
      const tx = await multiSigWallet.executeTransaction(
        destinationContractAddress,
        _value,
        data,
        (await multiSigWallet.nonce())+1n,
        signatureArray
      );

      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      if (receipt) {
        console.log('Transaction status:', receipt.status === 1 ? 'Success' : 'Failed');
      }
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw error;
    }
  });

task('balance', 'Get ERC20 token balance for an address')
  .addPositionalParam('tokenAddress', 'ERC20 token address')
  .addPositionalParam('address', 'Address to check balance for')
  .setAction(async (taskArgs, hre) => {
    const { tokenAddress, address } = taskArgs;
    const erc20Mock = await hre.ethers.getContractAt('ERC20Mock', tokenAddress);
    
    const balance = await erc20Mock.balanceOf(address);
    console.log(`Balance for ${address}: ${hre.ethers.formatEther(balance)} tokens`);
  });

task('getSigners', 'Get current signers and threshold of the MultiSig wallet')
  .addPositionalParam('multiSigAddress', 'MultiSig wallet address')
  .setAction(async (taskArgs, hre) => {
    const { multiSigAddress } = taskArgs;
    const multiSigWallet = await hre.ethers.getContractAt('MultiSigWallet', multiSigAddress);
    
    const signers = await multiSigWallet.getSigners();
    const threshold = await multiSigWallet.thresholdSignatures();
    
    console.log('Current Signers:');
    signers.forEach((signer, index) => {
      console.log(`${index + 1}. ${signer}`);
    });
    console.log(`Current Threshold: ${threshold}`);
  }); 