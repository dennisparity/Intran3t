import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OfficeBookingModule = buildModule("OfficeBooking", (m) => {
  const officeBooking = m.contract("OfficeBooking");
  return { officeBooking };
});

export default OfficeBookingModule;
