import { ethers } from 'hardhat';
import { ERC20Mock } from '../typechain-types';

async function main() {
  const args = process.argv.slice(2);
  const multiSigAddress = args[0];
  const tokenAddress = args[1]; // Address of ERC20Mock contract
  const amount = args[2]; // Amount in tokens

  const [owner] = await ethers.getSigners();
  const erc20Mock = (await ethers.getContractAt('ERC20Mock', tokenAddress)) as ERC20Mock;
  console.log('Owner address:', owner.address);

  // Get token balances before
  const ownerBalanceBefore = await erc20Mock.balanceOf(owner.address);
  const multiSigBalanceBefore = await erc20Mock.balanceOf(multiSigAddress);

  console.log('Owner token balance before:', ethers.formatEther(ownerBalanceBefore), 'tokens');
  console.log(
    'MultiSigWallet token balance before:',
    ethers.formatEther(multiSigBalanceBefore),
    'tokens',
  );

  // Send tokens to MultiSigWallet
  const tx = await erc20Mock.connect(owner).transfer(multiSigAddress, ethers.parseEther(amount));
  const receipt = await tx.wait();

  console.log('\nTransaction completed!');

  // Get token balances after
  const ownerBalanceAfter = await erc20Mock.balanceOf(owner.address);
  const multiSigBalanceAfter = await erc20Mock.balanceOf(multiSigAddress);

  console.log('Owner token balance after:', ethers.formatEther(ownerBalanceAfter), 'tokens');
  console.log(
    'MultiSigWallet token balance after:',
    ethers.formatEther(multiSigBalanceAfter),
    'tokens',
  );
  console.log('Transaction receipt:', receipt);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
