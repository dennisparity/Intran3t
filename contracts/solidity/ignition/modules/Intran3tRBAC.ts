import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Intran3tRBACModule = buildModule("Intran3tRBAC", (m) => {
  const rbac = m.contract("Intran3tRBAC");
  return { rbac };
});

export default Intran3tRBACModule;
