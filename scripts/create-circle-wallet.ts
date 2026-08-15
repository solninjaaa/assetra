import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

  console.log("API key loaded:", !!apiKey);
  console.log("Entity secret loaded:", !!entitySecret);
  console.log("Wallet Set ID loaded:", !!walletSetId);

  if (!apiKey || !entitySecret || !walletSetId) {
    throw new Error(
      "CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET or CIRCLE_WALLET_SET_ID is missing"
    );
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  const response = await client.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  });

  console.log("✅ Wallet created successfully!");
  console.log(JSON.stringify(response.data?.wallets, null, 2));
}

main().catch((error) => {
  console.error("❌ Wallet creation failed:");
  console.error(error);
  process.exit(1);
});