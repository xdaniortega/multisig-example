import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Run this script by running `npx hardhat ignition --module MultiSigWallet`
export default buildModule("MultiSigWallet", (m) => {
  // Get the first 3 accounts as signers
  const initialSigners = [
    m.getAccount(0),
    m.getAccount(1),
    m.getAccount(2),
  ];

  // Set threshold to 2 (requires 2 out of 3 signatures)
  const threshold = 2;

  // Deploy the MultiSigWallet contract
  const multiSigWallet = m.contract("MultiSigWallet", [initialSigners, threshold]);

  return { multiSigWallet };
}); 