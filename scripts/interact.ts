import { ethers } from "hardhat";

async function main() {
  // Get the deployed contract address from the deployment
  const multiSigWallet = await ethers.getContract("MultiSigWallet");

  // Obtener los signers actuales
  const signers = await multiSigWallet.getSigners();
  console.log("Signers actuales:", signers);

  // Obtener el threshold actual
  const threshold = await multiSigWallet.thresholdSignatures();
  console.log("Threshold actual:", threshold.toString());

  // Ejemplo de cómo crear una transacción
  const to = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Dirección destino
  const value = ethers.parseEther("0");
  const data = "0x"; // Sin datos adicionales

  // Obtener el hash de la transacción
  const txHash = await multiSigWallet.getTransactionHash(to, value, data);
  console.log("Hash de la transacción:", txHash);

  // Para firmar la transacción (esto se haría off-chain)
  const [signer1, signer2] = await ethers.getSigners();
  
  // Firmar el hash de la transacción
  const signature1 = await signer1.signMessage(ethers.getBytes(txHash));
  const signature2 = await signer2.signMessage(ethers.getBytes(txHash));

  // Ejecutar la transacción con las firmas
  const tx = await multiSigWallet.executeTransaction(
    to,
    value,
    data,
    [signature1, signature2]
  );

  console.log("Transacción enviada:", tx.hash);
  await tx.wait();
  console.log("Transacción confirmada!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 