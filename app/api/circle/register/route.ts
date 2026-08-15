import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.CIRCLE_KIT_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "CIRCLE_KIT_KEY is missing",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Circle API key loaded successfully",
  });
}