import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { MultiSigWallet, ERC20Mock } from '../typechain-types';

describe('MultiSigWallet', function () {
  let multiSigWallet: MultiSigWallet;
  let erc20Mock: ERC20Mock;
  let owner: any;
  let signer1: any;
  let signer2: any;
  let signer3: any;
  let nonSigner: any;
  let threshold: number;

  before(async () => {
    [owner, signer1, signer2, signer3, nonSigner] = await ethers.getSigners();
    const initialSigners = [owner.address, signer1.address, signer2.address, signer3.address];
    threshold = 2; //we'll set threshold to 2, so 2 out of 4 signatures are required

    const MultiSigWallet = await ethers.getContractFactory('MultiSigWallet');
    multiSigWallet = await MultiSigWallet.deploy(initialSigners, threshold);

    //First we send 100 ERC20 tokens to the multiSigWallet
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    erc20Mock = await ERC20Mock.deploy(
      'ERC20Mock',
      'ERC20Mock',
      owner.address,
      ethers.parseEther('1000000'),
    );
    await erc20Mock
      .connect(owner)
      .transfer(await multiSigWallet.getAddress(), ethers.parseEther('100'));
  });

  describe('Deployment', () => {
    it('Should have set the correct initial signers', async () => {
      const signers = await multiSigWallet.getSigners();

      expect(signers).to.include(owner.address);
      expect(signers).to.include(signer1.address);
      expect(signers).to.include(signer2.address);
      expect(signers).to.include(signer3.address);
      expect(signers.length).to.equal(4);
    });

    it('Should have set the correct threshold', async function () {
      expect(await multiSigWallet.thresholdSignatures()).to.equal(threshold);
    });

    it('Should have set the correct initial balance', async () => {
      const balance = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(balance).to.equal(ethers.parseEther('100'));
    });
  });

  describe('Happy Path Scenarios', () => {
    it('Transaction Execution :: Should execute ERC20 transfer with valid signatures', async () => {
      // Prepare the ERC20 transfer transaction
      const to = signer1.address;
      const value = ethers.parseEther('0'); // No ETH being sent
      const transferAmount = ethers.parseEther('50'); // Transfer 50 tokens

      // Create transaction data for ERC20 token transfer
      const data = erc20Mock.interface.encodeFunctionData('transfer', [to, transferAmount]);

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(
        await erc20Mock.getAddress(),
        value,
        data,
        nonce + BigInt(1),
      );

      // Sign the raw hash directly
      const signature1 = await owner.signMessage(ethers.getBytes(txHash));
      const signature2 = await signer1.signMessage(ethers.getBytes(txHash));

      // Balance of contract before
      const balanceBefore = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(balanceBefore).to.equal(ethers.parseEther('100'));

      // Execute the transaction
      await multiSigWallet.executeTransaction(
        await erc20Mock.getAddress(),
        value,
        data,
        nonce + BigInt(1),
        [signature1, signature2],
      );

      // Balance of contract after
      const balanceAfter = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(balanceAfter).to.equal(ethers.parseEther('50'));

      // Balance of signer1 after
      const balance = await erc20Mock.balanceOf(signer1.address);
      expect(balance).to.equal(transferAmount);

      // Verify that the MultiSigWallet balance decreased
      const multiSigBalance = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(multiSigBalance).to.equal(ethers.parseEther('50')); // 100 - 50 = 50
    });

    it('Signer Management :: Should add new signer and update threshold', async () => {
      const newSigner = nonSigner;
      const newThreshold = 3;

      // Create transaction data for adding signer
      const data = multiSigWallet.interface.encodeFunctionData('updateSignerSet', [
        newSigner.address,
        true,
        newThreshold,
      ]);

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(
        await multiSigWallet.getAddress(),
        0,
        data,
        nonce + BigInt(1),
      );

      // Sign the transaction
      const signature1 = await owner.signMessage(ethers.getBytes(txHash));
      const signature2 = await signer1.signMessage(ethers.getBytes(txHash));

      // Execute the transaction
      await multiSigWallet.executeTransaction(
        await multiSigWallet.getAddress(),
        0,
        data,
        nonce + BigInt(1),
        [signature1, signature2],
      );

      const signers = await multiSigWallet.getSigners();
      expect(signers).to.include(newSigner.address);
      expect(await multiSigWallet.thresholdSignatures()).to.equal(newThreshold);
    });

    it('Signer Management :: Should remove signer and update threshold', async () => {
      const newThreshold = 2;

      // Create transaction data for removing signer
      const data = multiSigWallet.interface.encodeFunctionData('updateSignerSet', [
        nonSigner.address,
        false,
        newThreshold,
      ]);

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(
        await multiSigWallet.getAddress(),
        0,
        data,
        nonce + BigInt(1),
      );

      // Sign the transaction
      const signature1 = await owner.signMessage(ethers.getBytes(txHash));
      const signature2 = await signer1.signMessage(ethers.getBytes(txHash));
      const signature3 = await nonSigner.signMessage(ethers.getBytes(txHash));

      // Execute the transaction
      await multiSigWallet.executeTransaction(
        await multiSigWallet.getAddress(),
        0,
        data,
        nonce + BigInt(1),
        [signature1, signature2, signature3],
      );

      const signers = await multiSigWallet.getSigners();
      expect(signers).to.not.include(nonSigner.address);
      expect(await multiSigWallet.thresholdSignatures()).to.equal(newThreshold);
    });
  });

  describe('Unhappy Path Scenarios', () => {
    it('Signer Management :: Should fail with insufficient signatures', async () => {
      const to = nonSigner.address;
      const value = ethers.parseEther('0.1');
      const data = '0x';

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(to, value, data, nonce + BigInt(1));
      const signature = await signer1.signMessage(ethers.getBytes(txHash));

      await expect(
        multiSigWallet.executeTransaction(to, value, data, nonce + BigInt(1), [signature]),
      ).to.be.revertedWithCustomError(multiSigWallet, 'insufficientSignatures');
    });

    it('Signer Management :: Should fail with invalid signature', async () => {
      const to = nonSigner.address;
      const value = ethers.parseEther('0.1');
      const data = '0x';

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(to, value, data, nonce + BigInt(1));
      const invalidSignature = await nonSigner.signMessage(ethers.getBytes(txHash));
      const validSignature = await signer1.signMessage(ethers.getBytes(txHash));

      await expect(
        multiSigWallet.executeTransaction(to, value, data, nonce + BigInt(1), [
          invalidSignature,
          validSignature,
        ]),
      ).to.be.revertedWithCustomError(multiSigWallet, 'invalidSignatures');
    });

    it('Signer Management :: Should fail when non-signer tries to add signer', async () => {
      const data = multiSigWallet.interface.encodeFunctionData('updateSignerSet', [
        nonSigner.address,
        true,
        2,
      ]);

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(
        await multiSigWallet.getAddress(),
        0,
        data,
        nonce + BigInt(1),
      );

      const signature = await nonSigner.signMessage(ethers.getBytes(txHash));

      await expect(
        multiSigWallet.executeTransaction(
          await multiSigWallet.getAddress(),
          0,
          data,
          nonce + BigInt(1),
          [signature],
        ),
      ).to.be.revertedWithCustomError(multiSigWallet, 'insufficientSignatures');
    });

    it('Should fail when trying to execute same transaction twice', async () => {
      const to = signer1.address;
      const value = ethers.parseEther('0');
      const data = '0x';

      const nonce = await multiSigWallet.nonce();
      const txHash = await multiSigWallet.getTransactionHash(to, value, data, nonce + BigInt(1));
      const signature1 = await owner.signMessage(ethers.getBytes(txHash));
      const signature2 = await signer1.signMessage(ethers.getBytes(txHash));

      // First execution should succeed
      await multiSigWallet.executeTransaction(to, value, data, nonce + BigInt(1), [
        signature1,
        signature2,
      ]);

      // Second execution should fail
      await expect(
        multiSigWallet.executeTransaction(to, value, data, nonce + BigInt(1), [
          signature1,
          signature2,
        ]),
      ).to.be.revertedWithCustomError(multiSigWallet, 'transactionAlreadyExecuted');
    });
  });
});
