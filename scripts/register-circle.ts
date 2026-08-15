import dotenv from "dotenv";
import {
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  console.log("API key loaded:", !!apiKey);
  console.log("Entity secret loaded:", !!entitySecret);

  if (!apiKey || !entitySecret) {
    throw new Error(
      "CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET is missing"
    );
  }

  const response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: "./recovery",
  });

  console.log("✅ Entity Secret registered successfully");
  console.log("Recovery file:", response.data?.recoveryFile);
}

main().catch((error) => {
  console.error("❌ Registration failed:");
  console.error(error);
  process.exit(1);
});