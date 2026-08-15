"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  useAccount,
  useReadContract,
} from "wagmi";

import { formatUnits } from "viem";

/* ---------------------------------------------------------
 * TOKENS
 * --------------------------------------------------------- */

const TOKENS = ["USDC", "EURC"] as const;

type Token = (typeof TOKENS)[number];

/* ---------------------------------------------------------
 * ARC TESTNET TOKEN ADDRESSES
 * --------------------------------------------------------- */

const TOKEN_ADDRESSES: Record<Token, `0x${string}`> = {
  USDC: "0x3600000000000000000000000000000000000000",

  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
};

/* ---------------------------------------------------------
 * ERC20 ABI
 * --------------------------------------------------------- */

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },
] as const;

/* ---------------------------------------------------------
 * ERROR HELPER
 * --------------------------------------------------------- */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return String(error);
}

/* ---------------------------------------------------------
 * PAGE
 * --------------------------------------------------------- */

export default function SwapPage() {
  const { address, isConnected } = useAccount();

  const [fromToken, setFromToken] =
    useState<Token>("USDC");

  const [toToken, setToToken] =
    useState<Token>("EURC");

  const [amount, setAmount] = useState("");

  const [estimatedOutput, setEstimatedOutput] =
    useState<string | null>(null);

  const [quoteId, setQuoteId] =
    useState<string | null>(null);

  const [rate, setRate] =
    useState<string | null>(null);

  const [fee, setFee] =
    useState<string | null>(null);

  const [loadingEstimate, setLoadingEstimate] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  /* -------------------------------------------------------
   * USDC BALANCE
   * ------------------------------------------------------- */

  const usdcBalance = useReadContract({
    address: TOKEN_ADDRESSES.USDC,

    abi: ERC20_ABI,

    functionName: "balanceOf",

    args: address ? [address] : undefined,

    query: {
      enabled: Boolean(address),
    },
  });

  const usdcDecimals = useReadContract({
    address: TOKEN_ADDRESSES.USDC,

    abi: ERC20_ABI,

    functionName: "decimals",

    query: {
      enabled: true,
    },
  });

  /* -------------------------------------------------------
   * EURC BALANCE
   * ------------------------------------------------------- */

  const eurcBalance = useReadContract({
    address: TOKEN_ADDRESSES.EURC,

    abi: ERC20_ABI,

    functionName: "balanceOf",

    args: address ? [address] : undefined,

    query: {
      enabled: Boolean(address),
    },
  });

  const eurcDecimals = useReadContract({
    address: TOKEN_ADDRESSES.EURC,

    abi: ERC20_ABI,

    functionName: "decimals",

    query: {
      enabled: true,
    },
  });

  /* -------------------------------------------------------
   * NORMALIZED BALANCES
   * ------------------------------------------------------- */

  const balances = useMemo(() => {
    let usdc = "0";
    let eurc = "0";

    if (
      usdcBalance.data !== undefined &&
      usdcDecimals.data !== undefined
    ) {
      usdc = formatUnits(
        usdcBalance.data,
        usdcDecimals.data
      );
    }

    if (
      eurcBalance.data !== undefined &&
      eurcDecimals.data !== undefined
    ) {
      eurc = formatUnits(
        eurcBalance.data,
        eurcDecimals.data
      );
    }

    return {
      USDC: usdc,
      EURC: eurc,
    };
  }, [
    usdcBalance.data,
    usdcDecimals.data,
    eurcBalance.data,
    eurcDecimals.data,
  ]);

  const currentFromBalance =
    balances[fromToken];

  const currentToBalance =
    balances[toToken];

  /* -------------------------------------------------------
   * RESET
   * ------------------------------------------------------- */

  const resetState = () => {
    setEstimatedOutput(null);
    setQuoteId(null);
    setRate(null);
    setFee(null);
    setError("");
    setSuccess(false);
  };

  /* -------------------------------------------------------
   * TOKEN CHANGE
   * ------------------------------------------------------- */

  const changeFromToken = (token: Token) => {
    if (token === toToken) {
      setToToken(fromToken);
    }

    setFromToken(token);
    setAmount("");
    resetState();
  };

  const changeToToken = (token: Token) => {
    if (token === fromToken) {
      setFromToken(toToken);
    }

    setToToken(token);
    setAmount("");
    resetState();
  };

  /* -------------------------------------------------------
   * SWITCH TOKENS
   * ------------------------------------------------------- */

  const switchTokens = () => {
    const oldFrom = fromToken;

    setFromToken(toToken);
    setToToken(oldFrom);

    setAmount("");
    resetState();
  };

  /* -------------------------------------------------------
   * MAX
   * ------------------------------------------------------- */

  const setMaxAmount = () => {
    if (
      !currentFromBalance ||
      Number(currentFromBalance) <= 0
    ) {
      return;
    }

    setAmount(currentFromBalance);
    resetState();
  };

  /* -------------------------------------------------------
   * GET CIRCLE QUOTE
   * ------------------------------------------------------- */

  const getEstimate = async () => {
    resetState();

    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (fromToken === toToken) {
      setError("Choose different tokens.");
      return;
    }

    if (
      Number(amount) >
      Number(currentFromBalance)
    ) {
      setError(
        `Insufficient ${fromToken} balance.`
      );
      return;
    }

    try {
      setLoadingEstimate(true);

      const response = await fetch(
        "/api/circle/swap",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            tokenIn: fromToken,
            tokenOut: toToken,
            amountIn: String(amount),
            walletAddress: address,
            action: "estimate",
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Circle quote response:",
        data
      );

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Unable to get Circle swap quote."
        );
      }

      /* -------------------------------------------------
       * OUTPUT AMOUNT
       * ------------------------------------------------- */

      if (
        data.amountOut !== null &&
        data.amountOut !== undefined
      ) {
        setEstimatedOutput(
          `${data.amountOut} ${toToken}`
        );
      } else if (
        data.quote?.to?.amount !== undefined
      ) {
        setEstimatedOutput(
          `${data.quote.to.amount} ${toToken}`
        );
      } else {
        setEstimatedOutput(
          "Quote received"
        );
      }

      /* -------------------------------------------------
       * EXTRA QUOTE DATA
       * ------------------------------------------------- */

      if (data.quoteId) {
        setQuoteId(String(data.quoteId));
      }

      if (data.rate) {
        setRate(String(data.rate));
      }

      if (data.fee) {
        setFee(String(data.fee));
      }

      setSuccess(true);
    } catch (err) {
      console.error(
        "========== CIRCLE QUOTE ERROR =========="
      );

      console.error(err);

      console.error(
        "message:",
        getErrorMessage(err)
      );

      console.error(
        "========================================="
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoadingEstimate(false);
    }
  };

  /* -------------------------------------------------------
   * UI
   * ------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#03070d] text-white">
      <div className="mx-auto w-full max-w-[620px] px-4 py-8 lg:py-10">

        {/* HEADER */}

        <div className="mb-7 flex items-start gap-4">

          <button
            onClick={() =>
              window.history.back()
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#07101a] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">
              Swap
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Swap USDC and EURC directly on
              Arc Testnet.
            </p>
          </div>

        </div>

        {/* CARD */}

        <div className="rounded-2xl border border-white/[0.08] bg-[#07101a] p-5 lg:p-6">

          {/* FROM */}

          <div className="rounded-xl border border-white/[0.07] bg-[#030910] p-4">

            <div className="flex items-center justify-between">

              <span className="text-[10px] text-slate-500">
                You Pay
              </span>

              <button
                onClick={setMaxAmount}
                className="text-[10px] font-semibold text-violet-400 transition hover:text-violet-300"
              >
                MAX
              </button>

            </div>

            <div className="mt-3 flex items-center justify-between gap-4">

              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  resetState();
                }}
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent text-3xl font-semibold outline-none placeholder:text-slate-700"
              />

              <div className="relative">

                <select
                  value={fromToken}
                  onChange={(e) =>
                    changeFromToken(
                      e.target.value as Token
                    )
                  }
                  className="cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#07101a] py-3 pl-3 pr-9 text-xs font-semibold outline-none"
                >
                  {TOKENS.map((token) => (
                    <option
                      key={token}
                      value={token}
                      className="bg-[#07101a]"
                    >
                      {token}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

              </div>

            </div>

            <div className="mt-4 flex items-center justify-between">

              <span className="text-[10px] text-slate-600">
                Available
              </span>

              <span className="text-[10px] font-medium text-slate-400">
                {Number(
                  currentFromBalance
                ).toFixed(6)}{" "}
                {fromToken}
              </span>

            </div>

          </div>

          {/* SWITCH */}

          <div className="relative z-10 flex justify-center">

            <button
              onClick={switchTokens}
              className="-my-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0a1420] text-violet-400 shadow-lg transition hover:text-white"
            >
              <ArrowDown size={16} />
            </button>

          </div>

          {/* TO */}

          <div className="rounded-xl border border-white/[0.07] bg-[#030910] p-4">

            <div className="flex items-center justify-between">

              <span className="text-[10px] text-slate-500">
                You Receive
              </span>

              <span className="text-[9px] text-slate-600">
                Estimated
              </span>

            </div>

            <div className="mt-3 flex items-center justify-between gap-4">

              <div
                className={`min-w-0 flex-1 text-3xl font-semibold ${
                  estimatedOutput
                    ? "text-white"
                    : "text-slate-600"
                }`}
              >
                {estimatedOutput ||
                  "0.00"}
              </div>

              <div className="relative">

                <select
                  value={toToken}
                  onChange={(e) =>
                    changeToToken(
                      e.target.value as Token
                    )
                  }
                  className="cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#07101a] py-3 pl-3 pr-9 text-xs font-semibold outline-none"
                >
                  {TOKENS.map((token) => (
                    <option
                      key={token}
                      value={token}
                      className="bg-[#07101a]"
                    >
                      {token}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

              </div>

            </div>

            <div className="mt-4 flex items-center justify-between">

              <span className="text-[10px] text-slate-600">
                Wallet balance
              </span>

              <span className="text-[10px] font-medium text-slate-400">
                {Number(
                  currentToBalance
                ).toFixed(6)}{" "}
                {toToken}
              </span>

            </div>

          </div>

          {/* QUOTE DETAILS */}

          {estimatedOutput && (
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#030910] p-4">

              <div className="flex items-center justify-between">

                <span className="text-[10px] text-slate-500">
                  Estimated receive
                </span>

                <span className="text-[10px] font-semibold text-slate-300">
                  {estimatedOutput}
                </span>

              </div>

              {rate && (
                <div className="mt-3 flex items-center justify-between">

                  <span className="text-[10px] text-slate-500">
                    Rate
                  </span>

                  <span className="text-[10px] text-slate-300">
                    {rate}
                  </span>

                </div>
              )}

              {fee && (
                <div className="mt-3 flex items-center justify-between">

                  <span className="text-[10px] text-slate-500">
                    Fee
                  </span>

                  <span className="text-[10px] text-slate-300">
                    {fee}
                  </span>

                </div>
              )}

              <div className="mt-3 flex items-center justify-between">

                <span className="text-[10px] text-slate-500">
                  Network
                </span>

                <span className="flex items-center gap-2 text-[10px] text-slate-300">

                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

                  Arc Testnet

                </span>

              </div>

              <div className="mt-3 flex items-center justify-between">

                <span className="text-[10px] text-slate-500">
                  Slippage
                </span>

                <span className="text-[10px] text-slate-300">
                  1.00%
                </span>

              </div>

              {quoteId && (
                <div className="mt-3 flex items-center justify-between">

                  <span className="text-[10px] text-slate-500">
                    Quote ID
                  </span>

                  <span className="max-w-[220px] truncate text-[9px] text-slate-600">
                    {quoteId}
                  </span>

                </div>
              )}

            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-400">

              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* SUCCESS */}

          {success && estimatedOutput && (
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4">

              <div className="flex items-center gap-2 text-green-400">

                <CheckCircle2 size={16} />

                <span className="text-xs font-semibold">
                  Quote received successfully
                </span>

              </div>

              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Circle returned a live quote for
                this swap.
              </p>

            </div>
          )}

          {/* WALLET */}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#030910] px-4 py-3">

            <div className="flex items-center gap-3">

              <Wallet
                size={16}
                className="text-violet-400"
              />

              <div>

                <p className="text-[10px] font-medium">
                  Connected Wallet
                </p>

                <p className="mt-0.5 text-[9px] text-slate-600">

                  {address
                    ? `${address.slice(
                        0,
                        6
                      )}...${address.slice(
                        -4
                      )}`
                    : "Connect wallet"}

                </p>

              </div>

            </div>

            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[8px] text-green-400">
              ARC TESTNET
            </span>

          </div>

          {/* BUTTON */}

          <button
            onClick={getEstimate}
            disabled={
              !isConnected ||
              !amount ||
              Number(amount) <= 0 ||
              loadingEstimate
            }
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {loadingEstimate ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Getting Quote...
              </>
            ) : (
              <>
                <RefreshCw size={16} />

                Get Swap Quote
              </>
            )}

          </button>

          {/* EXECUTION NOTE */}

          {estimatedOutput && (
            <div className="mt-4 rounded-xl border border-violet-500/15 bg-violet-600/[0.06] p-4">

              <div className="flex items-start gap-3">

                <Zap
                  size={15}
                  className="mt-0.5 shrink-0 text-violet-400"
                />

                <div>

                  <p className="text-[10px] font-semibold">
                    Quote ready
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-slate-500">
                    Live Circle quote successfully
                    received. Transaction execution
                    will be connected in the next step.
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* INFO */}

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-600/[0.06] p-4">

            <Zap
              size={15}
              className="mt-0.5 shrink-0 text-violet-400"
            />

            <div>

              <p className="text-[10px] font-semibold">
                Circle StableFX
              </p>

              <p className="mt-1 text-[9px] leading-4 text-slate-500">
                USDC and EURC quotes are requested
                securely through the Assetra server.
                Your Circle API credentials never
                reach the browser.
              </p>

            </div>

          </div>

          {/* FOOTER */}

          <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-slate-600">

            <ShieldCheck size={12} />

            Assetra never holds your personal
            wallet funds.

          </div>

        </div>
      </div>
    </main>
  );
}