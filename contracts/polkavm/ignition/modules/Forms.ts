import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FormsModule = buildModule("FormsModule", (m) => {
  const formsV2 = m.contract("FormsV2");

  return { formsV2 };
});

export default FormsModule;
