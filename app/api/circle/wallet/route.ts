import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";

export async function GET() {
  try {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const walletId = process.env.CIRCLE_WALLET_ID;

    if (!apiKey || !entitySecret || !walletId) {
      return NextResponse.json(
        {
          success: false,
          error: "Circle wallet configuration is missing",
        },
        { status: 500 }
      );
    }

    const client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    const response = await client.getWallet({
      id: walletId,
    });

    const wallet = response.data?.wallet;

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet?.id,
        address: wallet?.address,
        blockchain: wallet?.blockchain,
        state: wallet?.state,
      },
    });
  } catch (error) {
    console.error("Circle Wallet Error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Circle API error",
      },
      { status: 500 }
    );
  }
}