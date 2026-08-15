"use client";

import { useAccount } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowLeft,
  Coins,
  Activity,
} from "lucide-react";

const ARCSCAN_API =
  "https://testnet.arcscan.app/api/v2";

const ARCSCAN_TX =
  "https://testnet.arcscan.app/tx";

type Address = {
  hash?: string;
  name?: string | null;
  is_contract?: boolean;
};

type Transaction = {
  hash: string;
  timestamp?: string;
  block_number?: number;
  status?: string;
  method?: string | null;
  type?: number;
  value?: string;
  fee?: {
    value?: string;
  };
  from?: Address;
  to?: Address | null;
  result?: string;
};

type TokenTransfer = {
  transaction_hash: string;
  timestamp?: string;
  block_number?: number;
  method?: string | null;
  from?: Address;
  to?: Address | null;
  total?: {
    value?: string;
    decimals?: string | number;
  };
  token?: {
    address_hash?: string;
    name?: string;
    symbol?: string;
    decimals?: string | number;
    icon_url?: string | null;
  };
};

function shortAddress(address?: string | null) {
  if (!address) return "Unknown";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(timestamp?: string) {
  if (!timestamp) return "Unknown time";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
}

function formatTokenAmount(
  value?: string,
  decimals?: string | number
) {
  if (!value) return "0";

  const d = Number(decimals ?? 18);

  try {
    const amount = Number(value) / 10 ** d;

    if (!Number.isFinite(amount)) {
      return "0";
    }

    if (amount === 0) return "0";

    if (amount < 0.000001) {
      return amount.toExponential(2);
    }

    return amount.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  } catch {
    return "0";
  }
}

function formatNativeValue(value?: string) {
  if (!value || value === "0") return "0";

  try {
    const amount = Number(value) / 1e18;

    if (!Number.isFinite(amount)) {
      return "0";
    }

    return amount.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  } catch {
    return "0";
  }
}

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [tokenTransfers, setTokenTransfers] =
    useState<TokenTransfer[]>([]);

  const [loading, setLoading] = useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      setTokenTransfers([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const wallet = address.toLowerCase();

      const [
        transactionsResponse,
        transfersResponse,
      ] = await Promise.all([
        fetch(
          `${ARCSCAN_API}/addresses/${wallet}/transactions`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `${ARCSCAN_API}/addresses/${wallet}/token-transfers`,
          {
            cache: "no-store",
          }
        ),
      ]);

      let txItems: Transaction[] = [];

      let transferItems: TokenTransfer[] = [];

      /*
       * REAL TRANSACTIONS
       *
       * IMPORTANT:
       * Remove zero-value native transactions.
       *
       * This prevents entries like:
       *
       * Sent
       * -0 USDC
       *
       * from appearing.
       */
      if (transactionsResponse.ok) {
        const data =
          await transactionsResponse.json();

        if (Array.isArray(data?.items)) {
          txItems = data.items.filter(
            (tx: Transaction) => {
              return (
                tx.value !== undefined &&
                tx.value !== null &&
                tx.value !== "0"
              );
            }
          );
        }
      } else {
        console.error(
          "Transactions API:",
          transactionsResponse.status
        );
      }

      /*
       * TOKEN TRANSFERS
       *
       * We still load these because they contain
       * real ERC20 activity such as:
       *
       * Received USDC
       * Sent USDC
       * Swap USDC -> EURC
       *
       * But we DO NOT show a separate
       * "Token transfers" counter anymore.
       */
      if (transfersResponse.ok) {
        const data =
          await transfersResponse.json();

        if (Array.isArray(data?.items)) {
          transferItems = data.items;
        }
      } else {
        console.error(
          "Token transfers API:",
          transfersResponse.status
        );
      }

      setTransactions(txItems);

      setTokenTransfers(transferItems);

      setLastUpdated(new Date());

      if (
        !transactionsResponse.ok &&
        !transfersResponse.ok
      ) {
        setError(
          "Unable to load wallet activity."
        );
      }
    } catch (err) {
      console.error(
        "Activity loading error:",
        err
      );

      setError(
        "Failed to load transactions."
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      loadActivity();
    }, 15000);

    return () => clearInterval(interval);
  }, [address, loadActivity]);

  const walletAddress =
    address?.toLowerCase();

  /*
   * Group token transfers by transaction hash.
   * This lets us detect swaps.
   */
  const transferGroups =
    new Map<string, TokenTransfer[]>();

  tokenTransfers.forEach((transfer) => {
    const hash =
      transfer.transaction_hash;

    if (!transferGroups.has(hash)) {
      transferGroups.set(hash, []);
    }

    transferGroups
      .get(hash)!
      .push(transfer);
  });

  /*
   * Build activity list.
   */
  const activities = [
    /*
     * Native transactions
     *
     * Already filtered above so zero-value
     * transactions cannot appear.
     */
    ...transactions.map((tx) => ({
      kind: "transaction" as const,
      hash: tx.hash,
      timestamp: tx.timestamp,
      blockNumber: tx.block_number,
      from: tx.from?.hash,
      to: tx.to?.hash,
      method: tx.method,
      status: tx.status,
      value: tx.value,
      direction:
        tx.from?.hash?.toLowerCase() ===
        walletAddress
          ? "sent"
          : "received",
      token: "USDC",
      isSwap: false,
    })),

    /*
     * Real token activity.
     */
    ...tokenTransfers.map((transfer) => {
      const sameTransaction =
        transferGroups.get(
          transfer.transaction_hash
        ) || [];

      const hasSentToken =
        sameTransaction.some(
          (item) =>
            item.from?.hash?.toLowerCase() ===
            walletAddress
        );

      const hasReceivedToken =
        sameTransaction.some(
          (item) =>
            item.to?.hash?.toLowerCase() ===
            walletAddress
        );

      const isSwap =
        hasSentToken &&
        hasReceivedToken;

      return {
        kind: "token" as const,
        hash: transfer.transaction_hash,
        timestamp: transfer.timestamp,
        blockNumber:
          transfer.block_number,
        from: transfer.from?.hash,
        to: transfer.to?.hash,
        method: transfer.method,
        status: "ok",
        value: transfer.total?.value,
        direction:
          transfer.from?.hash?.toLowerCase() ===
          walletAddress
            ? "sent"
            : "received",
        token:
          transfer.token?.symbol ||
          transfer.token?.name ||
          "Token",
        decimals:
          transfer.token?.decimals,
        isSwap,
      };
    }),
  ];

  /*
   * Remove duplicate activities.
   */
  const uniqueActivities =
    Array.from(
      new Map(
        activities.map((item) => {
          const key =
            item.kind === "token"
              ? `${item.kind}-${item.hash}-${item.from}-${item.to}-${item.value}`
              : `${item.kind}-${item.hash}`;

          return [key, item];
        })
      ).values()
    );

  /*
   * Newest first.
   */
  uniqueActivities.sort((a, b) => {
    const aTime = a.timestamp
      ? new Date(a.timestamp).getTime()
      : 0;

    const bTime = b.timestamp
      ? new Date(b.timestamp).getTime()
      : 0;

    return bTime - aTime;
  });

  return (
    <main className="min-h-screen bg-[#02070d] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div>
            <a
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />

              Back to Dashboard
            </a>

            <h1 className="text-4xl font-semibold tracking-tight">
              Transactions
            </h1>

            <p className="mt-2 text-base text-slate-400">
              Complete on-chain activity for your connected wallet.
            </p>

            {lastUpdated && (
              <p className="mt-3 text-xs text-slate-600">
                Updated{" "}
                {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={loadActivity}
              disabled={
                loading || !address
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <a
              href={
                address
                  ? `https://testnet.arcscan.app/address/${address}`
                  : "https://testnet.arcscan.app"
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.06]"
            >
              View on ArcScan

              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* NOT CONNECTED */}

        {!isConnected || !address ? (
          <div className="rounded-3xl border border-white/10 bg-[#071019] px-6 py-24 text-center">

            <Activity
              size={38}
              className="mx-auto mb-5 text-slate-600"
            />

            <h2 className="text-xl font-medium">
              Wallet not connected
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Connect your wallet to view your on-chain activity.
            </p>
          </div>
        ) : (
          <>
            {/* WALLET */}

            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#071019] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-600">
                  Connected wallet
                </p>

                <p className="mt-1 font-mono text-sm text-slate-300">
                  {shortAddress(address)}
                </p>
              </div>

              {/* ONLY TRANSACTIONS COUNT */}

              <div className="text-sm">
                <span className="text-slate-600">
                  Transactions
                </span>

                <span className="ml-2 text-slate-300">
                  {transactions.length}
                </span>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* ACTIVITY */}

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#071019]">

              {loading &&
              uniqueActivities.length === 0 ? (
                <div className="px-6 py-24 text-center">

                  <RefreshCw
                    size={28}
                    className="mx-auto mb-4 animate-spin text-slate-600"
                  />

                  <p className="text-sm text-slate-400">
                    Loading on-chain activity...
                  </p>
                </div>
              ) : uniqueActivities.length === 0 ? (
                <div className="px-6 py-24 text-center">

                  <Activity
                    size={34}
                    className="mx-auto mb-4 text-slate-700"
                  />

                  <p className="text-base text-slate-300">
                    No transactions found.
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    New activity will appear automatically.
                  </p>
                </div>
              ) : (
                <div>
                  {uniqueActivities.map(
                    (activity, index) => {
                      const isSent =
                        activity.direction ===
                        "sent";

                      const isSwap =
                        "isSwap" in activity &&
                        activity.isSwap;

                      const isToken =
                        activity.kind ===
                        "token";

                      const amount =
                        isToken
                          ? formatTokenAmount(
                              activity.value,
                              activity.decimals
                            )
                          : formatNativeValue(
                              activity.value
                            );

                      const symbol =
                        isToken
                          ? activity.token
                          : "USDC";

                      const success =
                        activity.status ===
                          "ok" ||
                        activity.status ===
                          "success";

                      return (
                        <div
                          key={`${activity.hash}-${index}`}
                          className="group flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex min-w-0 items-center gap-4">

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                isSwap
                                  ? "bg-purple-500/10 text-purple-400"
                                  : isSent
                                    ? "bg-orange-500/10 text-orange-400"
                                    : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {isSwap ? (
                                <RefreshCw size={20} />
                              ) : isSent ? (
                                <ArrowUpRight size={20} />
                              ) : (
                                <ArrowDownLeft size={20} />
                              )}
                            </div>

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

                                <p className="font-medium">
                                  {isSwap
                                    ? "Swapped"
                                    : isSent
                                      ? "Sent"
                                      : "Received"}
                                </p>

                                {isToken && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                    <Coins size={10} />

                                    Token
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-slate-600">
                                {formatTime(
                                  activity.timestamp
                                )}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                                <span>
                                  From{" "}

                                  <span className="font-mono text-slate-400">
                                    {shortAddress(
                                      activity.from
                                    )}
                                  </span>
                                </span>

                                <span className="text-slate-700">
                                  →
                                </span>

                                <span>
                                  To{" "}

                                  <span className="font-mono text-slate-400">
                                    {shortAddress(
                                      activity.to
                                    )}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-5 sm:justify-end">

                            <div className="text-left sm:text-right">

                              <p
                                className={`font-mono text-sm ${
                                  isSent
                                    ? "text-orange-300"
                                    : "text-emerald-300"
                                }`}
                              >
                                {isSent
                                  ? "-"
                                  : "+"}

                                {amount}{" "}
                                {symbol}
                              </p>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 sm:justify-end">

                                {success ? (
                                  <>
                                    <CheckCircle2
                                      size={12}
                                      className="text-emerald-500"
                                    />

                                    Confirmed
                                  </>
                                ) : activity.status ===
                                  "pending" ? (
                                  <>
                                    <Clock3
                                      size={12}
                                      className="text-yellow-500"
                                    />

                                    Pending
                                  </>
                                ) : (
                                  <>
                                    <XCircle
                                      size={12}
                                      className="text-red-500"
                                    />

                                    Failed
                                  </>
                                )}
                              </div>
                            </div>

                            <a
                              href={`${ARCSCAN_TX}/${activity.hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-white/10 p-2 text-slate-500 transition hover:border-white/20 hover:text-white"
                              title="View transaction"
                            >
                              <ExternalLink
                                size={15}
                              />
                            </a>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}