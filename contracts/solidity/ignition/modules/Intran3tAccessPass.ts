import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Constructor grants DEFAULT_ADMIN_ROLE, ADMIN_ROLE, and MINTER_ROLE
// to the deployer automatically — no post-deploy setup required.
const Intran3tAccessPassModule = buildModule("Intran3tAccessPass", (m) => {
  const accessPass = m.contract("Intran3tAccessPass");
  return { accessPass };
});

export default Intran3tAccessPassModule;
