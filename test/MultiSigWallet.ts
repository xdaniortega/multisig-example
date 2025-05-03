import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { MultiSigWallet, ERC20Mock } from "../typechain-types";

describe("MultiSigWallet", function () {
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

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    multiSigWallet = await MultiSigWallet.deploy(initialSigners, threshold);

    //First we send 100 ERC20 tokens to the multiSigWallet
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Mock = await ERC20Mock.deploy("ERC20Mock", "ERC20Mock", owner.address, ethers.parseEther("1000000"));
    await erc20Mock.connect(owner).transfer(await multiSigWallet.getAddress(), ethers.parseEther("100"));
  });


  describe("Deployment", () => {
    it("Should have set the correct initial signers", async () => {
      const signers = await multiSigWallet.getSigners();
      
      expect(signers).to.include(owner.address);
      expect(signers).to.include(signer1.address);
      expect(signers).to.include(signer2.address);
      expect(signers).to.include(signer3.address);
      expect(signers.length).to.equal(4);
    });

    it("Should have set the correct threshold", async function () {
      expect(await multiSigWallet.thresholdSignatures()).to.equal(threshold);
    });

    it("Should have set the correct initial balance", async () => {
      const balance = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(balance).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Happy Path Scenarios", () => {
    it("Transaction Execution :: Should execute ERC20 transfer with valid signatures", async () => {
      // Preparar la transacción de transferencia de ERC20
      const to = signer1.address;
      const value = ethers.parseEther("0"); // No enviamos ETH
      const transferAmount = ethers.parseEther("50"); // Transferimos 50 tokens
      
      // Crear los datos de la transacción para transferir tokens ERC20
      const data = erc20Mock.interface.encodeFunctionData("transfer", [to, transferAmount]);

      // Obtener el hash de la transacción
      const txHash = await multiSigWallet.getTransactionHash(to, value, data);
      console.log("Transaction hash:", txHash);

      // Firmar la transacción con owner y signer1
      const signature1 = await owner.signMessage(txHash);
      const signature2 = await signer1.signMessage(txHash);

      console.log("Owner address:", owner.address);
      console.log("Signer1 address:", signer1.address);
      console.log("Signature1:", signature1);
      console.log("Signature2:", signature2);

      // Ejecutar la transacción
      await multiSigWallet.executeTransaction(
        to,
        value,
        data,
        0,
        [signature1, signature2]
      );

      // Verificar que los tokens se transfirieron correctamente
      const balance = await erc20Mock.balanceOf(signer1.address);
      expect(balance).to.equal(transferAmount);

      // Verificar que el balance del MultiSigWallet se redujo
      const multiSigBalance = await erc20Mock.balanceOf(await multiSigWallet.getAddress());
      expect(multiSigBalance).to.equal(ethers.parseEther("50")); // 100 - 50 = 50
    });

    it("Signer Management :: Should add new signer and update threshold", async () => {
      const newSigner = nonSigner;
      const newThreshold = 3;

      await multiSigWallet.addSignerAndUpdateThreshold(newSigner.address, newThreshold);

      const signers = await multiSigWallet.getSigners();
      expect(signers).to.include(newSigner.address);
      expect(await multiSigWallet.thresholdSignatures()).to.equal(newThreshold);
    });

    it("Signer Management :: Should remove signer and update threshold", async () => {
      await multiSigWallet.removeSigner(signer3.address);

      const signers = await multiSigWallet.getSigners();
      expect(signers).to.not.include(signer3.address);
    });
  });

  describe("Unhappy Path Scenarios", () => {
    it("Signer Management :: Should fail with insufficient signatures", async () => {
      const to = nonSigner.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";

      const txHash = await multiSigWallet.getTransactionHash(to, value, data, 0);
      const signature = await signer1.signMessage(txHash);

      await expect(
        multiSigWallet.executeTransaction(to, value, data, 0, [signature])
      ).to.be.revertedWithCustomError(multiSigWallet, "InsufficientSignatures");
    });

    it("Signer Management :: Should fail with invalid signature", async () => {
      const to = nonSigner.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";

      const txHash = await multiSigWallet.getTransactionHash(to, value, data, 0);
      const invalidSignature = await nonSigner.signMessage(txHash);
      const validSignature = await signer1.signMessage(txHash);

      await expect(
        multiSigWallet.executeTransaction(to, value, data, 0, [invalidSignature, validSignature])
      ).to.be.revertedWithCustomError(multiSigWallet, "InvalidSigner");
    });

    it("Signer Management :: Should fail when non-signer tries to add signer", async () => {
      await expect(
        multiSigWallet.connect(nonSigner).addSignerAndUpdateThreshold(nonSigner.address, 2)
      ).to.be.revertedWithCustomError(multiSigWallet, "NotSigner");
    });
  });
}); 