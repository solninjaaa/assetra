import { NextRequest, NextResponse } from "next/server";

const ARCSCAN_API = "https://testnet.arcscan.app/api/v2";

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing wallet address",
        },
        { status: 400 }
      );
    }

    const encodedAddress = encodeURIComponent(address);

    const urls = {
      transactions:
        `${ARCSCAN_API}/addresses/${encodedAddress}/transactions?page=1`,

      transfers:
        `${ARCSCAN_API}/addresses/${encodedAddress}/token-transfers?page=1`,

      internal:
        `${ARCSCAN_API}/addresses/${encodedAddress}/internal-transactions?page=1`,
    };

    const results = await Promise.allSettled([
      fetch(urls.transactions, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),

      fetch(urls.transfers, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),

      fetch(urls.internal, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
    ]);

    let transactions: any[] = [];
    let transfers: any[] = [];
    let internalTransactions: any[] = [];

    let transactionStatus = 0;
    let transferStatus = 0;
    let internalStatus = 0;

    if (results[0].status === "fulfilled") {
      transactionStatus = results[0].value.status;

      if (results[0].value.ok) {
        const data = await results[0].value.json();

        if (Array.isArray(data?.items)) {
          transactions = data.items;
        }
      }
    }

    if (results[1].status === "fulfilled") {
      transferStatus = results[1].value.status;

      if (results[1].value.ok) {
        const data = await results[1].value.json();

        if (Array.isArray(data?.items)) {
          transfers = data.items;
        }
      }
    }

    if (results[2].status === "fulfilled") {
      internalStatus = results[2].value.status;

      if (results[2].value.ok) {
        const data = await results[2].value.json();

        if (Array.isArray(data?.items)) {
          internalTransactions = data.items;
        }
      }
    }

    /*
     * DEBUG / SAFETY:
     *
     * If the exact transaction hash supplied by you
     * exists on ArcScan, fetch it directly too.
     */

    const knownHash =
      "0x9345263db6a3cb3721d3ccc106717b49e1f0d9bcc01eb4e08bf99c0ff63b9bfb";

    let knownTransaction: any = null;

    try {
      const response = await fetch(
        `${ARCSCAN_API}/transactions/${knownHash}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        knownTransaction = await response.json();
      }
    } catch (error) {
      console.error(
        "Known transaction lookup failed:",
        error
      );
    }

    return NextResponse.json({
      success: true,

      address,

      transactions,

      transfers,

      internalTransactions,

      knownTransaction,

      debug: {
        transactionStatus,
        transferStatus,
        internalStatus,

        transactionCount:
          transactions.length,

        transferCount:
          transfers.length,

        internalCount:
          internalTransactions.length,

        knownTransactionFound:
          !!knownTransaction,
      },
    });
  } catch (error) {
    console.error(
      "Arc activity route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load Arc activity",
      },
      { status: 500 }
    );
  }
}