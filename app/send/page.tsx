"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Send as SendIcon,
  Wallet,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { formatUnits, isAddress, parseUnits } from "viem";

const ARC_CHAIN_ID = 5042002;

const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as `0x${string}`;

const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
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
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
] as const;

export default function SendPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  /* =========================
     USDC BALANCE
  ========================= */

  const {
    data: usdcBalance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        Boolean(address) &&
        isConnected &&
        chainId === ARC_CHAIN_ID,
    },
  });

  /* =========================
     WRITE TRANSACTION
  ========================= */

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  /* =========================
     WAIT FOR TX
  ========================= */

  const {
    isLoading: confirming,
    isSuccess: transactionSuccess,
    isError: transactionFailed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  /* =========================
     FORMATTED BALANCE
  ========================= */

  const formattedBalance =
    usdcBalance !== undefined
      ? Number(formatUnits(usdcBalance, 6)).toFixed(2)
      : "0.00";

  /* =========================
     REFRESH BALANCE AFTER TX
  ========================= */

  useEffect(() => {
    if (transactionSuccess) {
      refetchBalance();
      setAmount("");
    }
  }, [transactionSuccess, refetchBalance]);

  /* =========================
     MAX BUTTON
  ========================= */

  function handleMax() {
    if (usdcBalance !== undefined) {
      setAmount(formatUnits(usdcBalance, 6));
      setError("");
    }
  }

  /* =========================
     SEND
  ========================= */

  function handleSend() {
    setError("");
    resetWrite();

    if (!isConnected || !address) {
      setError("Please connect your wallet first.");
      return;
    }

    if (chainId !== ARC_CHAIN_ID) {
      setError("Please switch your wallet to Arc Testnet.");
      return;
    }

    if (!recipient.trim()) {
      setError("Enter a recipient wallet address.");
      return;
    }

    if (!isAddress(recipient.trim())) {
      setError("Invalid recipient wallet address.");
      return;
    }

    if (!amount.trim()) {
      setError("Enter an amount.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid USDC amount.");
      return;
    }

    try {
      const amountInUnits = parseUnits(amount.trim(), 6);

      if (amountInUnits <= BigInt(0)) {
        setError("Amount must be greater than 0.");
        return;
      }

      if (usdcBalance === undefined) {
        setError("Unable to read your USDC balance.");
        return;
      }

      if (amountInUnits > usdcBalance) {
        setError(
          `Insufficient USDC balance. Available: ${formattedBalance} USDC`
        );
        return;
      }

      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "transfer",
        args: [
          recipient.trim() as `0x${string}`,
          amountInUnits,
        ],
      });
    } catch (err) {
      console.error("Send error:", err);
      setError("Unable to prepare the transaction.");
    }
  }

  /* =========================
     ERROR MESSAGE
  ========================= */

  const walletError =
    writeError?.message || "";

  return (
    <main className="min-h-screen bg-[#03070d] text-white">
      <div className="mx-auto w-full max-w-[620px] px-4 py-8 lg:py-10">

        {/* HEADER */}

        <div className="mb-8 flex items-start gap-4">

          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#07101a] text-slate-400 transition hover:border-white/[0.15] hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">
              Send USDC
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Send USDC directly from your wallet on Arc Testnet.
            </p>
          </div>

        </div>

        {/* CARD */}

        <div className="rounded-2xl border border-white/[0.08] bg-[#07101a] p-5 sm:p-6">

          {/* BALANCE */}

          <div className="rounded-xl border border-white/[0.06] bg-[#030910] p-5">

            <div className="flex items-center justify-between">

              <div className="min-w-0">

                <p className="text-[10px] text-slate-500">
                  Available Balance
                </p>

                <p className="mt-2 truncate text-xl font-semibold">
                  {balanceLoading
                    ? "Loading..."
                    : `${formattedBalance} USDC`}
                </p>

              </div>

              <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/20">
                <Wallet
                  size={18}
                  className="text-violet-400"
                />
              </div>

            </div>

          </div>

          {/* RECIPIENT */}

          <div className="mt-6">

            <label className="mb-2 block text-xs font-medium">
              Recipient Address
            </label>

            <input
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setError("");
                resetWrite();
              }}
              placeholder="0x..."
              spellCheck={false}
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#030910] px-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-violet-500/50"
            />

          </div>

          {/* AMOUNT */}

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between">

              <label className="text-xs font-medium">
                Amount
              </label>

              <button
                type="button"
                onClick={handleMax}
                disabled={
                  balanceLoading ||
                  usdcBalance === undefined
                }
                className="text-[10px] font-semibold text-violet-400 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                MAX
              </button>

            </div>

            <div className="relative">

              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                  resetWrite();
                }}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#030910] px-4 pr-20 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-violet-500/50"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                USDC
              </span>

            </div>

          </div>

          {/* NETWORK */}

          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#030910] px-4 py-4">

            <div>

              <p className="text-[9px] text-slate-600">
                Network
              </p>

              <p className="mt-1 text-xs font-medium">
                Arc Testnet
              </p>

            </div>

            <span className="rounded-full bg-violet-600/15 px-3 py-1 text-[9px] text-violet-400">
              Chain 5042002
            </span>

          </div>

          {/* ERROR */}

          {(error || walletError || transactionFailed) && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-400">

              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error ||
                  walletError ||
                  "Transaction failed. Please try again."}
              </span>

            </div>
          )}

          {/* SUCCESS */}

          {transactionSuccess && hash && (
            <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4">

              <div className="flex items-center gap-2 text-green-400">

                <CheckCircle2 size={16} />

                <span className="text-xs font-semibold">
                  Transaction successful
                </span>

              </div>

              <p className="mt-2 text-[10px] text-green-400/70">
                Your USDC has been sent successfully.
              </p>

              <a
                href={`https://testnet.arcscan.app/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-400 transition hover:text-violet-300"
              >
                View on ArcScan
                <ExternalLink size={11} />
              </a>

            </div>
          )}

          {/* SEND BUTTON */}

          <button
            onClick={handleSend}
            disabled={
              isPending ||
              confirming ||
              !isConnected ||
              chainId !== ARC_CHAIN_ID ||
              !recipient.trim() ||
              !amount.trim() ||
              transactionSuccess
            }
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {isPending ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Confirm in Wallet...
              </>
            ) : confirming ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Confirming...
              </>
            ) : transactionSuccess ? (
              <>
                <CheckCircle2 size={16} />
                Sent Successfully
              </>
            ) : (
              <>
                <SendIcon size={16} />
                Send USDC
              </>
            )}

          </button>

          {/* FOOTER */}

          <p className="mt-5 text-center text-[9px] leading-4 text-slate-600">
            Assetra never holds your funds. Transactions are
            signed directly through your connected wallet.
          </p>

        </div>

      </div>
    </main>
  );
}