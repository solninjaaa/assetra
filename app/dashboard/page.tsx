"use client";

import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Menu,
  X,
  Search,
  Send,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";

import {
  useAccount,
  useBalance,
  useChainId,
} from "wagmi";

import { useAppKit } from "@reown/appkit/react";
import { formatUnits } from "viem";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_HEX = "0x4cef52";

const ARCSCAN_API =
  "https://testnet.arcscan.app/api/v2";

const navItems = [
  "Dashboard",
  "Send",
  "Receive",
  "Swap",
  "Transactions",
  "Faucet",
];

type TokenBalance = {
  value: string;
  token?: {
    name?: string;
    symbol?: string;
    decimals?: number | string;
    exchange_rate?: string | null;
    address_hash?: string;
  };
};

type Transaction = {
  hash: string;
  from?: {
    hash?: string;
  };
  to?: {
    hash?: string;
  } | null;
  value?: string;
  fee?: {
    value?: string;
  };
  timestamp?: string;
  status?: string;
  method?: string;
  decoded_input?: {
    method_call?: string;
  };
};

type TokenTransfer = {
  transaction_hash?: string;

  from?: {
    hash?: string;
  };

  to?: {
    hash?: string;
  };

  total?: {
    value?: string;
    decimals?: number | string;
  };

  token?: {
    address_hash?: string;
    name?: string;
    symbol?: string;
    decimals?: number | string;
    exchange_rate?: string | null;
  };

  timestamp?: string;
};

/* ---------------------------------------------------------
   SAFE DECIMALS
--------------------------------------------------------- */

function safeDecimals(value: unknown): number {
  const decimals = Number(value);

  if (
    Number.isInteger(decimals) &&
    decimals >= 0
  ) {
    return decimals;
  }

  return 18;
}

/* ---------------------------------------------------------
   SAFE TOKEN AMOUNT
--------------------------------------------------------- */

function getTokenAmount(
  value: string,
  decimals: unknown
): number {
  try {
    const rawValue = BigInt(value || "0");
    const safe = safeDecimals(decimals);

    return Number(
      formatUnits(rawValue, safe)
    );
  } catch {
    return 0;
  }
}

/* ---------------------------------------------------------
   FORMAT TOKEN AMOUNT
--------------------------------------------------------- */

function formatTokenAmount(
  value: number
): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value >= 1000000) {
    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    );
  }

  if (value >= 1000) {
    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 4,
      }
    );
  }

  return value.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 6,
    }
  );
}

/* ---------------------------------------------------------
   TOKEN PRICE
--------------------------------------------------------- */

function getTokenPrice(
  item: TokenBalance
): number {
  const symbol =
    item.token?.symbol?.toUpperCase() || "";

  const exchangeRate =
    Number(
      item.token?.exchange_rate ?? "0"
    ) || 0;

  if (exchangeRate > 0) {
    return exchangeRate;
  }

  if (
    symbol === "USDC" ||
    symbol === "EURC"
  ) {
    return 1;
  }

  return 0;
}

/* ---------------------------------------------------------
   SHORT ADDRESS
--------------------------------------------------------- */

function shortAddress(
  address?: string
): string {
  if (!address) {
    return "Contract";
  }

  return `${address.slice(
    0,
    6
  )}...${address.slice(-4)}`;
}

/* ---------------------------------------------------------
   TIME FORMAT
--------------------------------------------------------- */

function formatTransactionTime(
  timestamp?: string
): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();

  const difference =
    now - date.getTime();

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */

export default function Dashboard() {
  const { address, isConnected } =
    useAccount();

  const chainId = useChainId();

  const { open } = useAppKit();

  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* -------------------------------------------------------
     NATIVE USDC
  ------------------------------------------------------- */

  const {
    data: nativeUsdcBalance,
    isLoading: usdcLoading,
  } = useBalance({
    address,
    chainId: ARC_CHAIN_ID,

    query: {
      enabled:
        !!address &&
        isConnected &&
        chainId === ARC_CHAIN_ID,
    },
  });

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [tokens, setTokens] =
    useState<TokenBalance[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [tokenTransfers, setTokenTransfers] =
    useState<TokenTransfer[]>([]);

  const [loadingTokens, setLoadingTokens] =
    useState(false);

  const [loadingTransactions, setLoadingTransactions] =
    useState(false);

  const [loadingTransfers, setLoadingTransfers] =
    useState(false);

  /* -------------------------------------------------------
     FETCH TOKEN BALANCES
  ------------------------------------------------------- */

  useEffect(() => {
    if (
      !address ||
      !isConnected ||
      chainId !== ARC_CHAIN_ID
    ) {
      setTokens([]);
      return;
    }

    let cancelled = false;

    const loadTokens = async () => {
      try {
        setLoadingTokens(true);

        const response = await fetch(
          `${ARCSCAN_API}/addresses/${address}/token-balances`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load token balances"
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setTokens(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          "Token balance error:",
          error
        );

        if (!cancelled) {
          setTokens([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTokens(false);
        }
      }
    };

    loadTokens();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    isConnected,
    chainId,
  ]);

  /* -------------------------------------------------------
     FETCH TRANSACTIONS
  ------------------------------------------------------- */

  useEffect(() => {
    if (
      !address ||
      !isConnected ||
      chainId !== ARC_CHAIN_ID
    ) {
      setTransactions([]);
      return;
    }

    let cancelled = false;

    const loadTransactions = async () => {
      try {
        setLoadingTransactions(true);

        const response = await fetch(
          `${ARCSCAN_API}/addresses/${address}/transactions`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load transactions"
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setTransactions(
            Array.isArray(data?.items)
              ? data.items
              : []
          );
        }
      } catch (error) {
        console.error(
          "Transaction error:",
          error
        );

        if (!cancelled) {
          setTransactions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTransactions(false);
        }
      }
    };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    isConnected,
    chainId,
  ]);

  /* -------------------------------------------------------
     FETCH REAL TOKEN TRANSFERS
  ------------------------------------------------------- */

  useEffect(() => {
    if (
      !address ||
      !isConnected ||
      chainId !== ARC_CHAIN_ID
    ) {
      setTokenTransfers([]);
      return;
    }

    let cancelled = false;

    const loadTokenTransfers = async () => {
      try {
        setLoadingTransfers(true);

        const response = await fetch(
          `${ARCSCAN_API}/addresses/${address}/token-transfers`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load token transfers"
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setTokenTransfers(
            Array.isArray(data?.items)
              ? data.items
              : []
          );
        }
      } catch (error) {
        console.error(
          "Token transfer error:",
          error
        );

        if (!cancelled) {
          setTokenTransfers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTransfers(false);
        }
      }
    };

    loadTokenTransfers();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    isConnected,
    chainId,
  ]);

  /* -------------------------------------------------------
     REAL USDC BALANCE
  ------------------------------------------------------- */

  const formattedUsdcBalance =
    !isConnected
      ? "0.00"
      : usdcLoading
      ? "..."
      : nativeUsdcBalance?.value !==
        undefined
      ? Number(
          formatUnits(
            nativeUsdcBalance.value,
            safeDecimals(
              nativeUsdcBalance.decimals
            )
          )
        ).toFixed(2)
      : "0.00";

  /* -------------------------------------------------------
     ONLY NON-ZERO TOKENS
  ------------------------------------------------------- */

  const visibleTokens = useMemo(() => {
    return tokens.filter((item) => {
      try {
        return (
          BigInt(
            item.value || "0"
          ) > 0n
        );
      } catch {
        return false;
      }
    });
  }, [tokens]);

  /* -------------------------------------------------------
     PORTFOLIO TOKENS
  ------------------------------------------------------- */

  const portfolioTokens =
    useMemo(() => {
      const result = [
        ...visibleTokens,
      ];

      const hasNativeUsdc =
        result.some(
          (item) =>
            item.token?.symbol
              ?.toUpperCase() ===
            "USDC"
        );

      if (
        !hasNativeUsdc &&
        nativeUsdcBalance?.value !==
          undefined &&
        nativeUsdcBalance.value > 0n
      ) {
        result.unshift({
          value:
            nativeUsdcBalance.value.toString(),

          token: {
            name: "USD Coin",
            symbol: "USDC",
            decimals:
              nativeUsdcBalance.decimals,
            exchange_rate: "1",
          },
        });
      }

      return result;
    }, [
      visibleTokens,
      nativeUsdcBalance,
    ]);

  /* -------------------------------------------------------
     TOTAL PORTFOLIO VALUE
  ------------------------------------------------------- */

  const portfolioTotal =
    useMemo(() => {
      let total = 0;

      for (const item of portfolioTokens) {
        const amount =
          getTokenAmount(
            item.value,
            item.token?.decimals
          );

        const price =
          getTokenPrice(item);

        total += amount * price;
      }

      return total;
    }, [portfolioTokens]);

  /* -------------------------------------------------------
     PORTFOLIO ALLOCATION
  ------------------------------------------------------- */

  const allocation =
    useMemo(() => {
      const items =
        portfolioTokens.map(
          (item) => {
            const amount =
              getTokenAmount(
                item.value,
                item.token?.decimals
              );

            const price =
              getTokenPrice(item);

            return {
              symbol:
                item.token?.symbol ||
                "TOKEN",

              value:
                amount * price,
            };
          }
        );

      const total =
        items.reduce(
          (sum, item) =>
            sum + item.value,
          0
        );

      return items
        .filter(
          (item) =>
            item.value > 0
        )
        .map((item) => ({
          ...item,

          percentage:
            total > 0
              ? (item.value / total) *
                100
              : 0,
        }));
    }, [portfolioTokens]);

  /* -------------------------------------------------------
     REAL RECENT ACTIVITY
  ------------------------------------------------------- */

  const recentActivity =
    useMemo(() => {
      if (!address) {
        return [];
      }

      const wallet =
        address.toLowerCase();

      const transferMap =
        new Map<
          string,
          TokenTransfer[]
        >();

      for (
        const transfer of tokenTransfers
      ) {
        const hash =
          transfer.transaction_hash;

        if (!hash) {
          continue;
        }

        const existing =
          transferMap.get(hash) ||
          [];

        existing.push(
          transfer
        );

        transferMap.set(
          hash,
          existing
        );
      }

      const activity = transactions
        .map((tx) => {
          const transfers =
            transferMap.get(
              tx.hash
            ) || [];

          const incoming =
            transfers.filter(
              (transfer) =>
                transfer.to?.hash?.toLowerCase() ===
                wallet
            );

          const outgoing =
            transfers.filter(
              (transfer) =>
                transfer.from?.hash?.toLowerCase() ===
                wallet
            );

          if (
            incoming.length === 0 &&
            outgoing.length === 0
          ) {
            return null;
          }

          const isSwap =
            incoming.length > 0 &&
            outgoing.length > 0;

          if (isSwap) {
            const outgoingParts =
              outgoing.map(
                (transfer) => {
                  const decimals =
                    transfer.total
                      ?.decimals ??
                    transfer.token
                      ?.decimals ??
                    18;

                  const amount =
                    getTokenAmount(
                      transfer.total
                        ?.value || "0",
                      decimals
                    );

                  const symbol =
                    transfer.token
                      ?.symbol ||
                    "TOKEN";

                  return `${formatTokenAmount(
                    amount
                  )} ${symbol}`;
                }
              );

            const incomingParts =
              incoming.map(
                (transfer) => {
                  const decimals =
                    transfer.total
                      ?.decimals ??
                    transfer.token
                      ?.decimals ??
                    18;

                  const amount =
                    getTokenAmount(
                      transfer.total
                        ?.value || "0",
                      decimals
                    );

                  const symbol =
                    transfer.token
                      ?.symbol ||
                    "TOKEN";

                  return `${formatTokenAmount(
                    amount
                  )} ${symbol}`;
                }
              );

            return {
              hash: tx.hash,
              type: "swap" as const,
              title: "Swapped",
              badge: "Swap",
              amount:
                `${outgoingParts.join(
                  " + "
                )} → ${incomingParts.join(
                  " + "
                )}`,
              counterparty:
                `From ${shortAddress(
                  outgoing[0]
                    ?.to?.hash ||
                    outgoing[0]
                      ?.from?.hash
                )}`,
              timestamp:
                tx.timestamp ||
                incoming[0]?.timestamp ||
                outgoing[0]?.timestamp,
            };
          }

          if (
            incoming.length > 0
          ) {
            const transfer =
              incoming[0];

            const decimals =
              transfer.total
                ?.decimals ??
              transfer.token
                ?.decimals ??
              18;

            const amount =
              getTokenAmount(
                transfer.total
                  ?.value || "0",
                decimals
              );

            const symbol =
              transfer.token
                ?.symbol ||
              "TOKEN";

            return {
              hash: tx.hash,
              type: "received" as const,
              title: "Received",
              badge: "Transfer",
              amount:
                `+${formatTokenAmount(
                  amount
                )} ${symbol}`,
              counterparty:
                `From ${shortAddress(
                  transfer.from?.hash
                )}`,
              timestamp:
                tx.timestamp ||
                transfer.timestamp,
            };
          }

          const transfer =
            outgoing[0];

          const decimals =
            transfer.total
              ?.decimals ??
            transfer.token
              ?.decimals ??
            18;

          const amount =
            getTokenAmount(
              transfer.total
                ?.value || "0",
              decimals
            );

          const symbol =
            transfer.token
              ?.symbol ||
            "TOKEN";

          return {
            hash: tx.hash,
            type: "sent" as const,
            title: "Sent",
            badge: "Transfer",
            amount:
              `-${formatTokenAmount(
                amount
              )} ${symbol}`,
            counterparty:
              `To ${shortAddress(
                transfer.to?.hash
              )}`,
            timestamp:
              tx.timestamp ||
              transfer.timestamp,
          };
        })
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            item !== null
        );

      return activity.slice(0, 5);
    }, [
      address,
      transactions,
      tokenTransfers,
    ]);

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  const goTo = (page: string) => {
    router.push(page);
  };

  const handleNav = (
    item: string
  ) => {
    setMobileMenuOpen(false);

    switch (item) {
      case "Dashboard":
        goTo("/dashboard");
        break;

      case "Send":
        goTo("/send");
        break;

      case "Receive":
        goTo("/receive");
        break;

      case "Swap":
        goTo("/swap");
        break;

      case "Transactions":
        goTo("/transactions");
        break;

      case "Faucet":
        goTo("/faucet");
        break;

      default:
        break;
    }
  };

  /* -------------------------------------------------------
     SWITCH TO ARC TESTNET
  ------------------------------------------------------- */

  const switchToArcTestnet =
    async () => {
      const ethereum =
        (window as any).ethereum;

      if (!ethereum) {
        console.error(
          "No browser wallet provider found."
        );

        return;
      }

      try {
        await ethereum.request({
          method:
            "wallet_switchEthereumChain",

          params: [
            {
              chainId:
                ARC_CHAIN_HEX,
            },
          ],
        });

        return;
      } catch (error: any) {
        if (error?.code !== 4902) {
          console.error(
            "Arc Testnet switch rejected:",
            error
          );

          return;
        }
      }

      try {
        await ethereum.request({
          method:
            "wallet_addEthereumChain",

          params: [
            {
              chainId:
                ARC_CHAIN_HEX,

              chainName:
                "Arc Testnet",

              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18,
              },

              rpcUrls: [
                "https://rpc.testnet.arc.network",
              ],

              blockExplorerUrls: [
                "https://testnet.arcscan.app",
              ],
            },
          ],
        });

        await ethereum.request({
          method:
            "wallet_switchEthereumChain",

          params: [
            {
              chainId:
                ARC_CHAIN_HEX,
            },
          ],
        });
      } catch (error) {
        console.error(
          "Arc Testnet network error:",
          error
        );
      }
    };

  /* -------------------------------------------------------
     WALLET
  ------------------------------------------------------- */

  const handleWallet =
    async () => {
      if (!isConnected) {
        open({
          view: "Connect",
        });

        return;
      }

      if (
        chainId !== ARC_CHAIN_ID
      ) {
        await switchToArcTestnet();
        return;
      }

      open({
        view: "Account",
      });
    };

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#03070d] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[220px] shrink-0 border-r border-white/[0.06] bg-[#040a12] lg:flex lg:flex-col">

          <button
            onClick={() => goTo("/")}
            className="flex h-[72px] w-full items-center gap-3 border-b border-white/[0.05] px-5 text-left transition hover:bg-white/[0.03]"
          >
           <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
           <Image
           src="/assetra-logo.png"
             alt="Assetra"
           width={40}
           height={40}
           priority
           className="h-full w-full object-cover"
            />
           </div>
            <span className="text-xl font-semibold">
              Assetra
            </span>
          </button>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {navItems.map(
              (item) => (
                <button
                  key={item}
                  onClick={() =>
                    handleNav(item)
                  }
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition ${
                    item ===
                    "Dashboard"
                      ? "bg-violet-600/20 text-white"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span>
                    {item}
                  </span>
                </button>
              )
            )}
          </nav>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            />

            <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#040a12] shadow-2xl">
              <div className="flex h-[72px] items-center justify-between border-b border-white/[0.05] px-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goTo("/");
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                    <Image
                      src="/assetra-logo.png"
                      alt="Assetra"
                      width={36}
                      height={36}
                      priority
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-lg font-semibold">Assetra</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                {navItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleNav(item)}
                    className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-sm transition ${
                      item === "Dashboard"
                        ? "bg-violet-600/20 text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>

              <div className="border-t border-white/[0.05] p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleWallet();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-left"
                >
                  <Wallet size={17} className="text-violet-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">
                      {isConnected && address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : "Connect Wallet"}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-500">
                      Arc Testnet
                    </p>
                  </div>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* MAIN */}

        <section className="min-w-0 flex-1">

          {/* TOPBAR */}

          <header className="flex h-[72px] items-center gap-4 border-b border-white/[0.06] px-4 lg:px-6">

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#080f18] text-slate-400 transition hover:text-white lg:hidden"
            >
              <Menu size={19} />
            </button>

            <div className="relative max-w-[600px] flex-1">

              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                placeholder="Search by token, protocol or address..."
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#080f18] pl-11 pr-4 text-xs outline-none placeholder:text-slate-600"
              />

            </div>

            <button
              onClick={
                handleWallet
              }
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs transition ${
                isConnected &&
                chainId !==
                  ARC_CHAIN_ID
                  ? "border-orange-500/30 bg-orange-500/10"
                  : "border-violet-500/30 bg-violet-600/10"
              }`}
            >

              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
  <Image
    src="/assetra-logo.png"
    alt="Assetra"
    width={28}
    height={28}
    priority
    className="h-full w-full object-cover"
  />
</div>

              {isConnected &&
              address
                ? `${address.slice(
                    0,
                    6
                  )}...${address.slice(
                    -4
                  )}`
                : "Connect Wallet"}

              <ChevronDown
                size={14}
              />

            </button>
          </header>

          <div className="p-4 lg:p-6">

            {/* HEADER */}

            <div className="mb-5">

              <h1 className="text-2xl font-semibold">
                Welcome back,
                Assetra User 👋
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Here's what's
                happening with
                your portfolio
                today.
              </p>

            </div>

            {/* TOP GRID */}

            <div className="grid gap-4 xl:grid-cols-3">

              {/* TOTAL PORTFOLIO */}

              <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#07101a] p-5">

                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-600/10 blur-3xl" />

                <div className="relative">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs text-slate-500">
                        Total Portfolio
                        Value
                      </p>

                      <p className="mt-3 text-3xl font-semibold tracking-tight">
                        {isConnected &&
                        chainId ===
                          ARC_CHAIN_ID
                          ? `$${portfolioTotal.toFixed(
                              2
                            )}`
                          : "$0.00"}
                      </p>

                    </div>

                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[9px] text-violet-300">
                      LIVE
                    </div>

                  </div>

                  <p className="mt-2 text-[10px] text-slate-600">
                    Live wallet
                    balance
                  </p>

                  <div className="mt-5 h-12 overflow-hidden rounded-lg">

                    <svg
                      viewBox="0 0 300 60"
                      className="h-full w-full"
                      preserveAspectRatio="none"
                    >

                      <defs>

                        <linearGradient
                          id="portfolioLine"
                          x1="0"
                          x2="1"
                        >

                          <stop
                            offset="0%"
                            stopColor="#7c3aed"
                          />

                          <stop
                            offset="100%"
                            stopColor="#d946ef"
                          />

                        </linearGradient>

                      </defs>

                      <path
                        d="M0 48 C30 45 40 50 65 38 C90 25 100 42 125 30 C150 18 170 35 190 20 C215 4 225 25 245 12 C265 2 280 17 300 5"
                        fill="none"
                        stroke="url(#portfolioLine)"
                        strokeWidth="2.5"
                      />

                    </svg>

                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">

                    <ShieldCheck
                      size={13}
                      className="text-violet-400"
                    />

                    Non-custodial

                  </div>

                </div>

              </div>

              {/* ASSET ALLOCATION */}

              <div className="rounded-xl border border-white/[0.07] bg-[#07101a] p-5">

                <div className="flex items-center justify-between">

                  <p className="text-xs font-semibold">
                    Asset Allocation
                  </p>

                  <span className="text-[9px] text-slate-600">
                    {allocation.length} assets
                  </span>

                </div>

                {allocation.length ===
                0 ? (

                  <div className="flex h-36 flex-col items-center justify-center text-center">

                    <Wallet
                      size={22}
                      className="text-slate-600"
                    />

                    <p className="mt-3 text-xs text-slate-400">
                      {isConnected
                        ? "No assets found"
                        : "Connect your wallet"}
                    </p>

                  </div>

                ) : (

                  <div className="flex flex-col items-center gap-5 py-4 sm:flex-row">

                    <AllocationChart
                      allocation={
                        allocation
                      }
                    />

                    <div className="flex-1 space-y-3">

                      {allocation.map(
                        (
                          item,
                          index
                        ) => (

                          <div
                            key={
                              item.symbol
                            }
                            className="flex items-center justify-between text-[10px]"
                          >

                            <div className="flex items-center gap-2">

                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  background:
                                    [
                                      "#8b5cf6",
                                      "#d946ef",
                                      "#6366f1",
                                      "#06b6d4",
                                      "#22c55e",
                                      "#f59e0b",
                                    ][
                                      index %
                                        6
                                    ],
                                }}
                              />

                              <span className="text-slate-400">
                                {
                                  item.symbol
                                }
                              </span>

                            </div>

                            <span className="text-slate-200">
                              {item.percentage.toFixed(
                                1
                              )}
                              %
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                )}

              </div>

              {/* QUICK ACTIONS */}

              <div className="rounded-xl border border-white/[0.07] bg-[#07101a] p-5">

                <p className="text-xs font-semibold">
                  Quick Actions
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2">

                  {[
                    [
                      Send,
                      "Send",
                    ],
                    [
                      ArrowDownToLine,
                      "Receive",
                    ],
                    [
                      ArrowLeftRight,
                      "Swap",
                    ],
                  ].map(
                    ([Icon, label]) => {

                      const ActionIcon =
                        Icon;

                      return (
                        <button
                          key={
                            label as string
                          }
                          onClick={() => {

                            if (
                              label ===
                              "Send"
                            ) {
                              goTo(
                                "/send"
                              );
                            }

                            if (
                              label ===
                              "Receive"
                            ) {
                              goTo(
                                "/receive"
                              );
                            }

                            if (
                              label ===
                              "Swap"
                            ) {
                              goTo(
                                "/swap"
                              );
                            }

                          }}
                          className="flex flex-col items-center gap-2 text-slate-500 transition hover:text-white"
                        >

                          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02]">

                            <ActionIcon
                              size={16}
                            />

                          </span>

                          <span className="text-[9px]">
                            {label as string}
                          </span>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>

            </div>

            {/* ASSETS + RECENT TRANSACTIONS */}

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">

              {/* ASSETS */}

              <div className="rounded-xl border border-white/[0.07] bg-[#07101a]">

                <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

                  <div>

                    <p className="text-xs font-semibold">
                      Your Assets
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Only assets
                      currently held
                      by your wallet
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      goTo(
                        "/transactions"
                      )
                    }
                    className="text-[10px] text-violet-400 transition hover:text-violet-300"
                  >
                    View all →
                  </button>

                </div>

                <div className="px-5">

                  {loadingTokens ? (

                    <p className="py-10 text-center text-xs text-slate-600">
                      Loading wallet
                      assets...
                    </p>

                  ) : portfolioTokens.length ===
                    0 ? (

                    <p className="py-10 text-center text-xs text-slate-600">
                      No assets found
                      in this wallet.
                    </p>

                  ) : (

                    <>

                      <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.04] py-3 text-[10px] sm:grid-cols-[1fr_auto_auto] sm:gap-4">

                        <span className="text-slate-500">
                          Asset
                        </span>

                        <span className="text-slate-500">
                          Balance
                        </span>

                        <span className="hidden text-slate-500 sm:block">
                          Value
                        </span>

                      </div>

                      {portfolioTokens
                        .slice(0, 5)
                        .map(
                          (
                            item,
                            index
                          ) => {

                            const amount =
                              getTokenAmount(
                                item.value,
                                item.token
                                  ?.decimals
                              );

                            const symbol =
                              item.token
                                ?.symbol ||
                              "TOKEN";

                            const name =
                              item.token
                                ?.name ||
                              symbol;

                            const price =
                              getTokenPrice(
                                item
                              );

                            const value =
                              amount *
                              price;

                            return (
                              <div
                                key={`${symbol}-${index}`}
                                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.04] py-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:gap-4"
                              >

                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-200">

                                    {symbol.slice(
                                      0,
                                      1
                                    )}

                                  </div>

                                  <div>

                                    <p className="text-xs font-medium">
                                      {name}
                                    </p>

                                    <p className="text-[9px] text-slate-600">
                                      {
                                        symbol
                                      }{" "}
                                      · Arc
                                      Testnet
                                    </p>

                                  </div>

                                </div>

                                <div className="text-right">

                                  <p className="text-[11px] text-slate-300">
                                    {formatTokenAmount(
                                      amount
                                    )}{" "}
                                    {
                                      symbol
                                    }
                                  </p>

                                </div>

                                <div className="hidden min-w-[65px] text-right sm:block">

                                  <p className="text-[11px] font-medium text-slate-200">
                                    $
                                    {value.toFixed(
                                      2
                                    )}
                                  </p>

                                  {price >
                                    0 && (
                                    <p className="mt-0.5 text-[8px] text-emerald-400">
                                      Live
                                    </p>
                                  )}

                                </div>

                              </div>
                            );
                          }
                        )}

                    </>

                  )}

                </div>

              </div>

              {/* RECENT TRANSACTIONS */}

              <div className="rounded-xl border border-white/[0.07] bg-[#07101a]">

                <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">

                  <div>

                    <p className="text-xs font-semibold">
                      Recent Transactions
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Real on-chain
                      wallet activity
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      goTo(
                        "/transactions"
                      )
                    }
                    className="text-[10px] text-violet-400 transition hover:text-violet-300"
                  >
                    View all →
                  </button>

                </div>

                <div className="px-5">

                  {loadingTransactions ||
                  loadingTransfers ? (

                    <p className="py-10 text-center text-xs text-slate-600">
                      Loading recent
                      activity...
                    </p>

                  ) : recentActivity.length ===
                    0 ? (

                    <p className="py-10 text-center text-xs text-slate-600">
                      No token activity
                      found.
                    </p>

                  ) : (

                    <div>

                      {recentActivity.map(
                        (item) => {

                          const isReceived =
                            item.type ===
                            "received";

                          const isSwap =
                            item.type ===
                            "swap";

                          return (
                            <button
                              key={
                                item.hash
                              }
                              onClick={() =>
                                window.open(
                                  `https://testnet.arcscan.app/tx/${item.hash}`,
                                  "_blank"
                                )
                              }
                              className="group flex w-full items-center gap-3 border-b border-white/[0.04] py-4 text-left last:border-0"
                            >

                              {/* ICON */}

                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                  isReceived
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : isSwap
                                    ? "bg-fuchsia-500/10 text-fuchsia-400"
                                    : "bg-violet-500/10 text-violet-400"
                                }`}
                              >

                                {isReceived ? (
                                  <ArrowDownLeft
                                    size={
                                      16
                                    }
                                  />
                                ) : isSwap ? (
                                  <ArrowLeftRight
                                    size={
                                      16
                                    }
                                  />
                                ) : (
                                  <ArrowUpRight
                                    size={
                                      16
                                    }
                                  />
                                )}

                              </div>

                              {/* DETAILS */}

                              <div className="min-w-0 flex-1">

                                <div className="flex items-center gap-2">

                                  <p className="text-xs font-medium">
                                    {
                                      item.title
                                    }
                                  </p>

                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[7px] ${
                                      isReceived
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : isSwap
                                        ? "bg-fuchsia-500/10 text-fuchsia-400"
                                        : "bg-violet-500/10 text-violet-400"
                                    }`}
                                  >
                                    {
                                      item.badge
                                    }
                                  </span>

                                </div>

                                <p className="mt-1 truncate text-[9px] text-slate-600">
                                  {
                                    item.counterparty
                                  }
                                </p>

                                <p className="mt-1 text-[8px] text-slate-700">
                                  {
                                    formatTransactionTime(
                                      item.timestamp
                                    )
                                  }
                                </p>

                              </div>

                              {/* AMOUNT */}

                              <div className="flex shrink-0 items-center gap-2">

                                <div className="text-right">

                                  <p
                                    className={`text-[10px] font-medium ${
                                      isReceived
                                        ? "text-emerald-400"
                                        : isSwap
                                        ? "text-fuchsia-300"
                                        : "text-slate-300"
                                    }`}
                                  >
                                    {
                                      item.amount
                                    }
                                  </p>

                                  <p className="mt-1 text-[8px] text-slate-700">
                                    Arc
                                    Testnet
                                  </p>

                                </div>

                                <ExternalLink
                                  size={
                                    12
                                  }
                                  className="text-slate-700 transition group-hover:text-violet-400"
                                />

                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>

                  )}

                </div>

              </div>

            </div>

            {/* NETWORK */}

            <div className="mt-4">

              <div className="rounded-xl border border-white/[0.07] bg-[#07101a] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <Zap
                        size={17}
                        className="text-violet-400"
                      />

                      <p className="text-xs font-semibold">
                        Network
                      </p>

                    </div>

                    <p className="mt-4 text-lg font-semibold">
                      {chainId ===
                      ARC_CHAIN_ID
                        ? "Arc Testnet"
                        : "Wrong Network"}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Chain ID:{" "}
                      {chainId}
                    </p>

                  </div>

                  {chainId ===
                    ARC_CHAIN_ID && (

                    <div className="text-right">

                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[9px] text-emerald-400">

                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                        Connected

                      </span>

                      <br />

                      <a
                        href="https://testnet.arcscan.app"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-400"
                      >

                        Open ArcScan

                        <ArrowUpRight
                          size={12}
                        />

                      </a>

                    </div>

                  )}

                </div>

                {isConnected &&
                  chainId !==
                    ARC_CHAIN_ID && (

                    <button
                      onClick={
                        switchToArcTestnet
                      }
                      className="mt-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-[10px] font-semibold"
                    >
                      Switch to Arc Testnet
                    </button>

                  )}

              </div>

            </div>

            {/* FOOTER */}

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-[#07101a] px-5 py-3 text-[10px] text-slate-600">

              <ShieldCheck
                size={13}
              />

              Your assets. Your control.

              <span className="ml-auto">
                Assetra never holds
                your funds.
              </span>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}

/* ---------------------------------------------------------
   DONUT CHART
--------------------------------------------------------- */

function AllocationChart({
  allocation,
}: {
  allocation: {
    symbol: string;
    value: number;
    percentage: number;
  }[];
}) {
  let current = 0;

  const gradients = [
    "#8b5cf6",
    "#d946ef",
    "#6366f1",
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
  ];

  const parts = allocation.map(
    (item, index) => {
      const start = current;

      current += item.percentage;

      return `${
        gradients[
          index %
            gradients.length
        ]
      } ${start}% ${current}%`;
    }
  );

  return (
    <div
      className="relative h-28 w-28 shrink-0 rounded-full"
      style={{
        background:
          parts.length > 0
            ? `conic-gradient(${parts.join(
                ", "
              )})`
            : "#111827",
      }}
    >

      {/* INNER RING */}

      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full border border-white/[0.04] bg-[#07101a]">

        <span className="text-xl font-semibold">
          {allocation.length}
        </span>

        <span className="text-[8px] uppercase tracking-wider text-slate-600">
          Assets
        </span>

      </div>

    </div>
  );
}