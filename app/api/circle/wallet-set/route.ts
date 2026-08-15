import { NextResponse } from "next/server";
import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";

export async function POST() {
  try {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

    if (!apiKey || !entitySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Circle API key or Entity Secret is missing",
        },
        { status: 500 }
      );
    }

    const client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    const response = await client.createWalletSet({
      name: "Assetra Wallets",
    });

    const walletSetId = response.data?.walletSet?.id;

    if (!walletSetId) {
      throw new Error("Wallet Set ID was not returned");
    }

    return NextResponse.json({
      success: true,
      message: "Assetra Wallet Set created successfully",
      walletSetId,
    });
  } catch (error) {
    console.error("Wallet Set Error:", error);

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