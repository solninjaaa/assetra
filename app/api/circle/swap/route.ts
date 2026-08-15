import { NextResponse } from "next/server";

const ALLOWED_TOKENS = ["USDC", "EURC"] as const;

type Token = (typeof ALLOWED_TOKENS)[number];

function isAllowedToken(token: unknown): token is Token {
  return (
    typeof token === "string" &&
    ALLOWED_TOKENS.includes(token as Token)
  );
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

    // ---------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------

    if (
      !tokenIn ||
      !tokenOut ||
      !amountIn ||
      !walletAddress
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "tokenIn, tokenOut, amountIn and walletAddress are required",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // TOKEN VALIDATION
    // ---------------------------------------------

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

    // ---------------------------------------------
    // SAME TOKEN CHECK
    // ---------------------------------------------

    if (tokenIn === tokenOut) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose two different tokens",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // AMOUNT VALIDATION
    // ---------------------------------------------

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

    // ---------------------------------------------
    // WALLET ADDRESS VALIDATION
    // ---------------------------------------------

    if (
      typeof walletAddress !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // RETURN SWAP CONFIG
    // ---------------------------------------------

    return NextResponse.json({
      success: true,

      action,

      walletAddress,

      tokenIn,

      tokenOut,

      amountIn: String(amountIn),

      config: {
        chain: "Arc_Testnet",
        supportedTokens: ALLOWED_TOKENS,
        slippageBps: 100,
        allowanceStrategy: "permit",
      },

      message:
        "Arc Testnet swap configuration is valid. Quote and execution are handled by the connected wallet on the client.",
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