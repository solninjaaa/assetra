import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AssetraEscrowModule = buildModule("AssetraEscrowModule", (m) => {
  const escrow = m.contract("AssetraEscrow");

  return {
    escrow,
  };
});

export default AssetraEscrowModule;