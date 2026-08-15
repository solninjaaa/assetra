import { NextResponse } from "next/server";
import { SwapKit } from "@circle-fin/swap-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

const kit = new SwapKit();

const ALLOWED_TOKENS = ["USDC", "EURC"] as const;

type Token = (typeof ALLOWED_TOKENS)[number];

function isAllowedToken(token: string): token is Token {
  return ALLOWED_TOKENS.includes(token as Token);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      tokenIn,
      tokenOut,
      amountIn,
      walletAddress,
      action = "estimate",
    } = body;

    if (!tokenIn || !tokenOut || !amountIn || !walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "tokenIn, tokenOut, amountIn and walletAddress are required",
        },
        { status: 400 }
      );
    }

    if (
      !isAllowedToken(tokenIn) ||
      !isAllowedToken(tokenOut)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported Arc Testnet token",
        },
        { status: 400 }
      );
    }

    if (tokenIn === tokenOut) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose two different tokens",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amountIn);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid swap amount",
        },
        { status: 400 }
      );
    }

    const kitKey = process.env.KIT_KEY;

    if (!kitKey) {
      return NextResponse.json(
        {
          success: false,
          error: "KIT_KEY is missing",
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     *
     * This API route should NOT create a Circle Wallets adapter.
     *
     * MetaMask / injected wallet swaps use the Viem adapter
     * in the client where the wallet provider exists.
     *
     * Therefore this server route is used only as a
     * configuration/validation endpoint and does not try
     * to execute the user's wallet transaction.
     */

    return NextResponse.json({
      success: true,
      action,
      walletAddress,
      tokenIn,
      tokenOut,
      amountIn: String(amountIn),

      config: {
        chain: "Arc_Testnet",
        kitKeyConfigured: true,
        supportedTokens: ALLOWED_TOKENS,
      },

      message:
        "Arc Testnet swap configuration is valid. Use the connected wallet's Viem adapter for quote and execution.",
    });
  } catch (error) {
    console.error("Circle swap API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Circle swap failed",
      },
      { status: 500 }
    );
  }
}