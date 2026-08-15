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
  useWalletClient,
} from "wagmi";

import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { SwapKit } from "@circle-fin/swap-kit";
import { formatUnits } from "viem";

/* ---------------------------------------------------------
 * TOKENS
 * --------------------------------------------------------- */

const TOKENS = ["USDC", "EURC", "cirBTC"] as const;

type Token = (typeof TOKENS)[number];

/* ---------------------------------------------------------
 * ARC TESTNET TOKEN ADDRESSES
 * --------------------------------------------------------- */

const TOKEN_ADDRESSES: Record<Token, `0x${string}`> = {
  USDC: "0x3600000000000000000000000000000000000000",

  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",

  cirBTC: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
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
 * PAGE
 * --------------------------------------------------------- */

export default function SwapPage() {
  const { address, isConnected } = useAccount();

  const { data: walletClient } = useWalletClient();

  const [fromToken, setFromToken] = useState<Token>("USDC");

  const [toToken, setToToken] = useState<Token>("EURC");

  const [amount, setAmount] = useState("");

  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(
    null
  );

  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [loadingSwap, setLoadingSwap] = useState(false);

  const [success, setSuccess] = useState(false);

  const [txHash, setTxHash] = useState<string | null>(null);

  const [error, setError] = useState("");

  /* -------------------------------------------------------
   * CIRBTC CHECK
   * ------------------------------------------------------- */

  const isCirBtcSelected =
    fromToken === "cirBTC" || toToken === "cirBTC";

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
   * CIRBTC BALANCE
   * ------------------------------------------------------- */

  const cirBtcBalance = useReadContract({
    address: TOKEN_ADDRESSES.cirBTC,

    abi: ERC20_ABI,

    functionName: "balanceOf",

    args: address ? [address] : undefined,

    query: {
      enabled: Boolean(address),
    },
  });

  const cirBtcDecimals = useReadContract({
    address: TOKEN_ADDRESSES.cirBTC,

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
    let cirBTC = "0";

    if (
      usdcBalance.data !== undefined &&
      usdcDecimals.data !== undefined
    ) {
      usdc = formatUnits(usdcBalance.data, usdcDecimals.data);
    }

    if (
      eurcBalance.data !== undefined &&
      eurcDecimals.data !== undefined
    ) {
      eurc = formatUnits(eurcBalance.data, eurcDecimals.data);
    }

    if (
      cirBtcBalance.data !== undefined &&
      cirBtcDecimals.data !== undefined
    ) {
      cirBTC = formatUnits(
        cirBtcBalance.data,
        cirBtcDecimals.data
      );
    }

    return {
      USDC: usdc,
      EURC: eurc,
      cirBTC,
    };
  }, [
    usdcBalance.data,
    usdcDecimals.data,
    eurcBalance.data,
    eurcDecimals.data,
    cirBtcBalance.data,
    cirBtcDecimals.data,
  ]);

  const currentFromBalance = balances[fromToken];

  const currentToBalance = balances[toToken];

  /* -------------------------------------------------------
   * RESET
   * ------------------------------------------------------- */

  const resetState = () => {
    setEstimatedOutput(null);
    setError("");
    setSuccess(false);
    setTxHash(null);
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
   * CIRCLE ADAPTER
   * ------------------------------------------------------- */

  const getAdapter = async () => {
    if (!walletClient) {
      throw new Error(
        "Wallet client not available. Please reconnect your wallet."
      );
    }

    const provider = {
      request: walletClient.request,
    };

    return createViemAdapterFromProvider({
      provider:
        provider as Parameters<
          typeof createViemAdapterFromProvider
        >[0]["provider"],
    });
  };

  /* -------------------------------------------------------
   * SWAP CONFIG
   * ------------------------------------------------------- */

  const getSwapConfig = () => ({
    slippageBps: 100,
    allowanceStrategy: "permit" as const,
  });

  /* -------------------------------------------------------
   * GET ESTIMATE
   * ------------------------------------------------------- */

  const getEstimate = async () => {
    resetState();

    /* cirBTC DOES NOT HAVE SWAP YET */

    if (isCirBtcSelected) {
      setError(
        "Coming soon — cirBTC swaps are not available yet."
      );
      return;
    }

    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    if (!walletClient) {
      setError(
        "Wallet is not ready. Please reconnect your wallet."
      );
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

    if (Number(amount) > Number(currentFromBalance)) {
      setError(`Insufficient ${fromToken} balance.`);
      return;
    }

    try {
      setLoadingEstimate(true);

      const adapter = await getAdapter();

      const kit = new SwapKit();

      const estimate = await kit.estimate({
        from: {
          adapter,
          chain: "Arc_Testnet" as const,
        },

        tokenIn: fromToken,

        tokenOut: toToken,

        amountIn: String(amount),

        config: getSwapConfig(),
      });

      const output = estimate.estimatedOutput;

      if (
        typeof output === "object" &&
        output !== null
      ) {
        setEstimatedOutput(
          `${output.amount} ${output.token}`
        );
      } else {
        setEstimatedOutput(String(output));
      }
    } catch (err) {
      console.error("Swap quote error:", err);

      const message =
        err instanceof Error ? err.message : String(err);

      if (
        message.toLowerCase().includes("no route")
      ) {
        setError(
          `${fromToken} → ${toToken} currently has no available route on Arc Testnet.`
        );
      } else {
        setError(message);
      }
    } finally {
      setLoadingEstimate(false);
    }
  };

  /* -------------------------------------------------------
   * EXECUTE SWAP
   * ------------------------------------------------------- */

  const executeSwap = async () => {
    setError("");
    setSuccess(false);
    setTxHash(null);

    /* cirBTC DOES NOT HAVE SWAP YET */

    if (isCirBtcSelected) {
      setError(
        "Coming soon — cirBTC swaps are not available yet."
      );
      return;
    }

    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }

    if (!walletClient) {
      setError(
        "Wallet is not ready. Please reconnect your wallet."
      );
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

    if (Number(amount) > Number(currentFromBalance)) {
      setError(`Insufficient ${fromToken} balance.`);
      return;
    }

    try {
      setLoadingSwap(true);

      const adapter = await getAdapter();

      const kit = new SwapKit();

      /* Fresh quote */

      const estimate = await kit.estimate({
        from: {
          adapter,
          chain: "Arc_Testnet" as const,
        },

        tokenIn: fromToken,

        tokenOut: toToken,

        amountIn: String(amount),

        config: getSwapConfig(),
      });

      const output = estimate.estimatedOutput;

      const outputText =
        typeof output === "object" &&
        output !== null
          ? `${output.amount} ${output.token}`
          : String(output);

      const confirmed = window.confirm(
        `Swap ${amount} ${fromToken} → approximately ${outputText}?\n\nYour connected wallet will ask you to approve the transaction.`
      );

      if (!confirmed) {
        setLoadingSwap(false);
        return;
      }

      const result = await kit.swap({
        from: {
          adapter,
          chain: "Arc_Testnet" as const,
        },

        tokenIn: fromToken,

        tokenOut: toToken,

        amountIn: String(amount),

        config: getSwapConfig(),
      });

      setSuccess(true);

      setTxHash(result?.txHash || null);

      if (result?.amountOut) {
        setEstimatedOutput(
          `${result.amountOut} ${toToken}`
        );
      }

      await Promise.all([
        usdcBalance.refetch(),
        usdcDecimals.refetch(),
        eurcBalance.refetch(),
        eurcDecimals.refetch(),
        cirBtcBalance.refetch(),
        cirBtcDecimals.refetch(),
      ]);
    } catch (err) {
      console.error("Swap execution error:", err);

      const message =
        err instanceof Error ? err.message : String(err);

      if (
        message.toLowerCase().includes("no route")
      ) {
        setError(
          `${fromToken} → ${toToken} has no available route right now on Arc Testnet.`
        );
      } else {
        setError(message);
      }
    } finally {
      setLoadingSwap(false);
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
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#07101a] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">
              Swap
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Swap USDC and EURC directly on Arc Testnet.
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
                {Number(currentFromBalance).toFixed(6)}{" "}
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
                {isCirBtcSelected ? "Unavailable" : "Estimated"}
              </span>

            </div>

            <div className="mt-3 flex items-center justify-between gap-4">

              <div
                className={`min-w-0 flex-1 text-3xl font-semibold ${
                  isCirBtcSelected
                    ? "text-slate-600"
                    : estimatedOutput
                    ? "text-white"
                    : "text-slate-600"
                }`}
              >
                {isCirBtcSelected
                  ? "Coming soon"
                  : estimatedOutput || "0.00"}
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
                {Number(currentToBalance).toFixed(6)}{" "}
                {toToken}
              </span>

            </div>

          </div>

          {/* CIRBTC COMING SOON */}

          {isCirBtcSelected && (
            <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                  <Zap
                    size={17}
                    className="text-violet-400"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-white">
                    cirBTC Swap
                  </p>

                  <p className="mt-1 text-[10px] text-slate-500">
                    Coming soon
                  </p>
                </div>

              </div>

              <p className="mt-4 text-[10px] leading-5 text-slate-500">
                Swapping between cirBTC and other assets
                will be available in a future Assetra update.
              </p>

            </div>
          )}

          {/* QUOTE */}

          {estimatedOutput && !isCirBtcSelected && (
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#030910] p-4">

              <div className="flex items-center justify-between">

                <span className="text-[10px] text-slate-500">
                  Estimated receive
                </span>

                <span className="text-[10px] font-semibold text-slate-300">
                  {estimatedOutput}
                </span>

              </div>

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

          {success && !isCirBtcSelected && (
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4">

              <div className="flex items-center gap-2 text-green-400">

                <CheckCircle2 size={16} />

                <span className="text-xs font-semibold">
                  Swap successful
                </span>

              </div>

              {txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-[10px] text-violet-400 hover:text-violet-300"
                >
                  View transaction on ArcScan
                </a>
              )}

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
                      )}...${address.slice(-4)}`
                    : "Connect wallet"}
                </p>

              </div>

            </div>

            <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[8px] text-green-400">
              ARC TESTNET
            </span>

          </div>

          {/* BUTTON */}

          {isCirBtcSelected ? (

            <button
              disabled
              className="mt-5 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-500"
            >
              <Zap size={16} />

              Coming Soon

            </button>

          ) : !estimatedOutput ? (

            <button
              onClick={getEstimate}
              disabled={
                !isConnected ||
                !walletClient ||
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

          ) : (

            <button
              onClick={executeSwap}
              disabled={loadingSwap}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >

              {loadingSwap ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Executing Swap...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />

                  Confirm Swap
                </>
              )}

            </button>

          )}

          {/* INFO */}

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-600/[0.06] p-4">

            <Zap
              size={15}
              className="mt-0.5 shrink-0 text-violet-400"
            />

            <div>

              <p className="text-[10px] font-semibold">
                Circle Swap
              </p>

              <p className="mt-1 text-[9px] leading-4 text-slate-500">
                USDC and EURC swaps are routed through
                Circle&apos;s supported liquidity infrastructure.
                cirBTC swaps are coming soon.
              </p>

            </div>

          </div>

          {/* FOOTER */}

          <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-slate-600">

            <ShieldCheck size={12} />

            Assetra never holds your personal wallet funds.

          </div>

        </div>
      </div>
    </main>
  );
}