import { network } from "hardhat";

const { viem } = await network.connect();

const token = await viem.deployContract("AssetraToken");

console.log("AssetraToken deployed at:", token.address);