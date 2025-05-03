import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC20Mock", (m) => {
  const initialHolder = m.getAccount(0);
    const token = m.contract("ERC20Mock", [
    "Mock Token", // nombre
    "MTK",        // símbolo
    initialHolder, // initial holder
    BigInt("1000000000000000000000000")
  ]);

  return { token };
}); 