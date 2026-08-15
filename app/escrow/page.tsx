"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  decodeEventLog,
  formatUnits,
  isAddress,
  parseUnits,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  ESCROW_ABI,
  ESCROW_ADDRESS,
  USDC_ABI,
  USDC_ADDRESS,
} from "@/lib/escrow";

type EscrowItem = {
  id: string;
  buyer: string;
  seller: string;
  token: string;
  amount: bigint;
  deadline: bigint;
  status: number;
};

const STATUS_LABELS = [
  "Created",
  "Funded",
  "Released",
  "Refunded",
];

export default function EscrowPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  /* --------------------------------------------------
   * FORM
   * -------------------------------------------------- */

  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineValue, setDeadlineValue] = useState("7");
  const [deadlineUnit, setDeadlineUnit] = useState("days");

  /* --------------------------------------------------
   * ESCROW STATE
   * -------------------------------------------------- */

  const [escrowId, setEscrowId] = useState("");
  const [myEscrows, setMyEscrows] = useState<EscrowItem[]>([]);
  const [selectedEscrow, setSelectedEscrow] =
    useState<EscrowItem | null>(null);

  const [loadingEscrows, setLoadingEscrows] = useState(false);
  const [message, setMessage] = useState("");

  /* --------------------------------------------------
   * LIVE CLOCK
   *
   * This forces the page to re-render every second so
   * "Time Remaining" never gets stuck.
   * -------------------------------------------------- */

  const [, setNowTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* --------------------------------------------------
   * WALLET TRANSACTION
   * -------------------------------------------------- */

  const {
    writeContract,
    data: txHash,
    isPending,
    isError: isWriteError,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const processing = isPending || isConfirming;

  /* --------------------------------------------------
   * SELECT ESCROW
   * -------------------------------------------------- */

  const selectEscrow = useCallback((escrow: EscrowItem) => {
    setSelectedEscrow(escrow);
    setEscrowId(escrow.id);

    setSeller(escrow.seller);
    setAmount(formatUnits(escrow.amount, 6));

    setMessage(`Escrow #${escrow.id} selected.`);
  }, []);

  /* --------------------------------------------------
   * LOAD ALL USER ESCROWS
   *
   * Blockchain is the source of truth.
   *
   * preferredId:
   * If supplied, that escrow is automatically selected.
   * Otherwise current selection is preserved.
   * -------------------------------------------------- */

  const loadMyEscrows = useCallback(
    async (preferredId?: string) => {
      if (!publicClient || !address) {
        setMyEscrows([]);
        setSelectedEscrow(null);
        setEscrowId("");
        return;
      }

      setLoadingEscrows(true);

      try {
        const count = (await publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: "escrowCount",
        })) as bigint;

        const ids = Array.from(
          { length: Number(count) },
          (_, index) => BigInt(index)
        );

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const data = (await publicClient.readContract({
                address: ESCROW_ADDRESS,
                abi: ESCROW_ABI,
                functionName: "getEscrow",
                args: [id],
              })) as readonly [
                `0x${string}`,
                `0x${string}`,
                `0x${string}`,
                bigint,
                bigint,
                number
              ];

              const [
                buyer,
                sellerAddress,
                token,
                escrowAmount,
                deadline,
                status,
              ] = data;

              return {
                id: id.toString(),
                buyer,
                seller: sellerAddress,
                token,
                amount: escrowAmount,
                deadline,
                status: Number(status),
              } satisfies EscrowItem;
            } catch {
              return null;
            }
          })
        );

        const userEscrows = results
          .filter(
  (item): item is NonNullable<typeof item> =>
    item !== null
)
          .filter(
            (item) =>
              item.buyer.toLowerCase() ===
              address.toLowerCase()
          )
          .sort(
            (a, b) =>
              Number(BigInt(b.id) - BigInt(a.id))
          );

        setMyEscrows(userEscrows);

        /* ----------------------------------------------
         * AUTOMATIC SELECTION
         *
         * New escrow:
         * preferredId = newly created ID
         *
         * Normal refresh:
         * preserve currently selected escrow
         *
         * First load:
         * select latest escrow
         * ---------------------------------------------- */

        const targetId =
          preferredId ||
          escrowId ||
          userEscrows[0]?.id;

        if (targetId) {
          const target = userEscrows.find(
            (item) => item.id === targetId
          );

          if (target) {
            setSelectedEscrow(target);
            setEscrowId(target.id);
            setSeller(target.seller);
            setAmount(
              formatUnits(target.amount, 6)
            );
          } else if (userEscrows.length > 0) {
            selectEscrow(userEscrows[0]);
          } else {
            setSelectedEscrow(null);
            setEscrowId("");
          }
        } else {
          setSelectedEscrow(null);
          setEscrowId("");
        }
      } catch (error) {
        console.error(
          "Failed to load escrows:",
          error
        );

        setMessage(
          "Could not load your escrows from blockchain."
        );
      } finally {
        setLoadingEscrows(false);
      }
    },
    [
      publicClient,
      address,
      escrowId,
      selectEscrow,
    ]
  );

  /* --------------------------------------------------
   * INITIAL LOAD / WALLET CHANGE
   * -------------------------------------------------- */

  useEffect(() => {
    if (
      !isConnected ||
      !address ||
      !publicClient
    ) {
      return;
    }

    loadMyEscrows();
  }, [
    isConnected,
    address,
    publicClient,
    loadMyEscrows,
  ]);

  /* --------------------------------------------------
   * TRANSACTION CONFIRMED
   * -------------------------------------------------- */

  useEffect(() => {
    if (!receipt || !isConfirmed) {
      return;
    }

    let createdEscrowId: string | undefined;

    try {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ESCROW_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (
            decoded.eventName ===
            "EscrowCreated"
          ) {
            const args = decoded.args as {
              escrowId: bigint;
            };

            createdEscrowId =
              args.escrowId.toString();

            break;
          }
        } catch {
          // Ignore unrelated contract logs.
        }
      }
    } catch {
      // Ignore decode failure.
    }

    if (createdEscrowId) {
      setEscrowId(createdEscrowId);

      setMessage(
        `Escrow #${createdEscrowId} created successfully.`
      );

      /*
       * IMPORTANT:
       * Newly created escrow becomes selected
       * automatically.
       */
      setTimeout(() => {
        loadMyEscrows(createdEscrowId);
      }, 700);
    } else {
      setMessage(
        "Transaction confirmed successfully."
      );

      setTimeout(() => {
        loadMyEscrows();
      }, 700);
    }
  }, [
    receipt,
    isConfirmed,
    loadMyEscrows,
  ]);

  /* --------------------------------------------------
   * ERROR HANDLING
   * -------------------------------------------------- */

  useEffect(() => {
    if (isWriteError) {
      setMessage(
        "Transaction was rejected or failed."
      );
    }

    if (isReceiptError) {
      setMessage(
        "Transaction failed while confirming."
      );
    }
  }, [
    isWriteError,
    isReceiptError,
  ]);

  /* --------------------------------------------------
   * CREATE ESCROW
   * -------------------------------------------------- */

  const createEscrow = () => {
    if (!address) {
      setMessage(
        "Connect your wallet first."
      );
      return;
    }

    if (
      !seller ||
      !amount ||
      !deadlineValue
    ) {
      setMessage(
        "Fill all fields."
      );
      return;
    }

    if (!isAddress(seller)) {
      setMessage(
        "Enter a valid seller wallet address."
      );
      return;
    }

    const value = Number(
      deadlineValue
    );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setMessage(
        "Enter a valid deadline."
      );
      return;
    }

    try {
      const amountRaw =
        parseUnits(amount, 6);

      let seconds = 0;

      if (
        deadlineUnit === "minutes"
      ) {
        seconds =
          value * 60;
      } else if (
        deadlineUnit === "hours"
      ) {
        seconds =
          value * 60 * 60;
      } else {
        seconds =
          value * 24 * 60 * 60;
      }

      const deadline = BigInt(
        Math.floor(
          Date.now() / 1000
        ) + seconds
      );

      setMessage(
        "Creating escrow..."
      );

      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName:
          "createEscrow",
        args: [
          seller as `0x${string}`,
          USDC_ADDRESS,
          amountRaw,
          deadline,
        ],
      });
    } catch {
      setMessage(
        "Invalid amount or wallet address."
      );
    }
  };

  /* --------------------------------------------------
   * APPROVE USDC
   * -------------------------------------------------- */

  const approveUSDC = () => {
    if (!amount) {
      setMessage(
        "Enter amount first."
      );
      return;
    }

    try {
      const amountRaw =
        parseUnits(amount, 6);

      setMessage(
        "Waiting for USDC approval..."
      );

      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [
          ESCROW_ADDRESS,
          amountRaw,
        ],
      });
    } catch {
      setMessage(
        "Invalid amount."
      );
    }
  };

  /* --------------------------------------------------
   * FUND
   * -------------------------------------------------- */

  const fundEscrow = () => {
    if (!escrowId) {
      setMessage(
        "Create or select an escrow first."
      );
      return;
    }

    setMessage(
      "Funding escrow..."
    );

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName:
        "fundEscrow",
      args: [
        BigInt(escrowId),
      ],
    });
  };

  /* --------------------------------------------------
   * RELEASE
   * -------------------------------------------------- */

  const releasePayment = () => {
    if (!escrowId) {
      setMessage(
        "Select an escrow first."
      );
      return;
    }

    setMessage(
      "Releasing payment to seller..."
    );

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName:
        "releasePayment",
      args: [
        BigInt(escrowId),
      ],
    });
  };

  /* --------------------------------------------------
   * REFUND
   * -------------------------------------------------- */

  const refundEscrow = () => {
    if (!escrowId) {
      setMessage(
        "Select an escrow first."
      );
      return;
    }

    if (!selectedEscrow) {
      setMessage(
        "Escrow details not loaded."
      );
      return;
    }

    const now = BigInt(
      Math.floor(
        Date.now() / 1000
      )
    );

    if (
      selectedEscrow.status !== 1
    ) {
      setMessage(
        "Refund is only available for a funded escrow."
      );
      return;
    }

    if (
      now <
      selectedEscrow.deadline
    ) {
      setMessage(
        `Deadline not reached yet. ${formatRemaining(
          selectedEscrow.deadline
        )} remaining.`
      );
      return;
    }

    setMessage(
      "Requesting refund..."
    );

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "refund",
      args: [
        BigInt(escrowId),
      ],
    });
  };

  /* --------------------------------------------------
   * PERMISSIONS
   * -------------------------------------------------- */

  const refundAllowed =
    !!selectedEscrow &&
    selectedEscrow.status === 1 &&
    BigInt(
      Math.floor(
        Date.now() / 1000
      )
    ) >=
      selectedEscrow.deadline;

  const releaseAllowed =
    !!selectedEscrow &&
    selectedEscrow.status === 1;

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white transition mb-4"
            >
              <ArrowLeft size={14} />
              Back to dashboard
            </Link>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Assetra Escrow
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Secure on-chain payments without trusting a middleman.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] text-violet-300 text-xs">
            <ShieldCheck size={15} />
            Non-custodial
          </div>
        </div>

        {/* FEATURES */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Feature
            icon={<LockKeyhole size={17} />}
            title="Lock funds"
            text="USDC stays inside the smart contract."
          />

          <Feature
            icon={<CheckCircle2 size={17} />}
            title="Release"
            text="Buyer releases payment when work is complete."
          />

          <Feature
            icon={<Clock3 size={17} />}
            title="Refund"
            text="Refund becomes available after the deadline."
          />
        </div>

        {/* ==================================================
            MAIN TWO-COLUMN AREA

            LEFT:
              Create + Fund
              Selected escrow

            RIGHT:
              Payment history

            This structure fixes the huge blank gap.
           ================================================== */}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">

          {/* ==================================================
              LEFT COLUMN
             ================================================== */}

          <div className="min-w-0">

            {/* CREATE + FUND */}
            <div className="grid md:grid-cols-2 gap-5">

              {/* CREATE */}
              <section className="rounded-2xl border border-white/[0.07] bg-[#080d18] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-300 flex items-center justify-center text-xs font-bold">
                      01
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold">
                        Create escrow
                      </h2>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Define the payment terms.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">

                  <Input
                    label="Seller wallet"
                    placeholder="0x..."
                    value={seller}
                    onChange={setSeller}
                  />

                  <Input
                    label="Amount (USDC)"
                    placeholder="100"
                    value={amount}
                    onChange={setAmount}
                  />

                  <div>
                    <label className="block text-xs text-slate-500 mb-2">
                      Deadline
                    </label>

                    <div className="grid grid-cols-[1fr_110px] gap-2">
                      <input
                        value={deadlineValue}
                        onChange={(e) =>
                          setDeadlineValue(
                            e.target.value
                          )
                        }
                        type="number"
                        min="1"
                        placeholder="7"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition"
                      />

                      <select
                        value={deadlineUnit}
                        onChange={(e) =>
                          setDeadlineUnit(
                            e.target.value
                          )
                        }
                        className="rounded-xl border border-white/[0.08] bg-[#030712] px-3 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition"
                      >
                        <option value="minutes">
                          Minutes
                        </option>

                        <option value="hours">
                          Hours
                        </option>

                        <option value="days">
                          Days
                        </option>
                      </select>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-600">
                      Refund becomes available after{" "}
                      {deadlineValue || "0"}{" "}
                      {deadlineUnit}.
                    </p>
                  </div>

                  <button
                    onClick={createEscrow}
                    disabled={
                      !isConnected ||
                      processing
                    }
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition"
                  >
                    {processing
                      ? "Processing..."
                      : "Create Escrow"}
                  </button>
                </div>
              </section>

              {/* FUND */}
              <section className="rounded-2xl border border-white/[0.07] bg-[#080d18] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-300 flex items-center justify-center text-xs font-bold">
                      02
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold">
                        Fund escrow
                      </h2>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Approve USDC and lock the payment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">

                  <label className="block text-xs text-slate-500 mb-2">
                    Escrow ID
                  </label>

                  <input
                    value={escrowId}
                    onChange={(e) =>
                      setEscrowId(
                        e.target.value
                      )
                    }
                    placeholder="Select an escrow"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition"
                  />

                  {/* SELECTED ESCROW MINI PREVIEW */}
                  {selectedEscrow && (
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">
                          Escrow #{selectedEscrow.id}
                        </span>

                        <StatusBadge
                          escrow={selectedEscrow}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <MiniInfo
                          label="Amount"
                          value={`${formatUnits(
                            selectedEscrow.amount,
                            6
                          )} USDC`}
                        />

                        <MiniInfo
                          label="Time"
                          value={formatRemaining(
                            selectedEscrow.deadline
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4">

                    <button
                      onClick={approveUSDC}
                      disabled={
                        !isConnected ||
                        !amount ||
                        processing ||
                        (!!selectedEscrow &&
                          selectedEscrow.status !== 0)
                      }
                      className="py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition"
                    >
                      Approve USDC
                    </button>

                    <button
                      onClick={fundEscrow}
                      disabled={
                        !isConnected ||
                        !escrowId ||
                        processing ||
                        (!!selectedEscrow &&
                          selectedEscrow.status !== 0)
                      }
                      className="py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition"
                    >
                      Fund Escrow
                    </button>

                  </div>
                </div>
              </section>
            </div>

            {/* ==================================================
                SELECTED ESCROW
               ================================================== */}

            {selectedEscrow && (
              <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#080d18] overflow-hidden">

                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-cyan-400">
                      Selected escrow
                    </p>

                    <h2 className="text-lg font-semibold mt-1">
                      Escrow #{selectedEscrow.id}
                    </h2>
                  </div>

                  <StatusBadge
                    escrow={selectedEscrow}
                  />
                </div>

                <div className="p-5">

                  <div className="grid sm:grid-cols-4 gap-3">

                    <Info
                      label="Amount"
                      value={`${formatUnits(
                        selectedEscrow.amount,
                        6
                      )} USDC`}
                    />

                    <Info
                      label="Seller"
                      value={shortAddress(
                        selectedEscrow.seller
                      )}
                    />

                    <Info
                      label="Deadline"
                      value={formatDate(
                        selectedEscrow.deadline
                      )}
                    />

                    <Info
                      label="Time remaining"
                      value={formatRemaining(
                        selectedEscrow.deadline
                      )}
                    />

                  </div>

                  <div className="mt-5 pt-5 border-t border-white/[0.06]">

                    <div className="mb-4">
                      <h3 className="text-sm font-semibold">
                        Manage payment
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        Release the payment or request a refund after the deadline.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">

                      <button
                        onClick={releasePayment}
                        disabled={
                          !isConnected ||
                          !escrowId ||
                          !releaseAllowed ||
                          processing
                        }
                        className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition"
                      >
                        Release Payment
                      </button>

                      <button
                        onClick={refundEscrow}
                        disabled={
                          !isConnected ||
                          !escrowId ||
                          !refundAllowed ||
                          processing
                        }
                        className="py-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-300 hover:bg-red-500/[0.10] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition"
                      >
                        {selectedEscrow.status === 3
                          ? "Already Refunded"
                          : selectedEscrow.status !== 1
                          ? "Refund — Not Funded"
                          : refundAllowed
                          ? "Refund"
                          : "Refund — Deadline Not Reached"}
                      </button>

                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ==================================================
              RIGHT COLUMN — PAYMENT HISTORY
             ================================================== */}

          <aside className="lg:sticky lg:top-6">

            <section className="rounded-2xl border border-white/[0.07] bg-[#080d18] overflow-hidden">

              <div className="px-5 py-4 border-b border-white/[0.06]">

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-cyan-400">
                      Your escrows
                    </p>

                    <h2 className="text-lg font-semibold mt-1">
                      Payment history
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Stored on-chain and available after refresh.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      loadMyEscrows()
                    }
                    disabled={
                      !isConnected ||
                      loadingEscrows
                    }
                    title="Refresh escrows"
                    className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-center disabled:opacity-40 transition"
                  >
                    <RefreshCw
                      size={14}
                      className={
                        loadingEscrows
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>

                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Total escrows
                  </span>

                  <span className="text-xs font-semibold text-white">
                    {myEscrows.length}
                  </span>
                </div>
              </div>

              <div className="p-3 max-h-[610px] overflow-y-auto">

                {!isConnected && (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-4 text-xs text-yellow-300">
                    Connect your wallet to see your escrows.
                  </div>
                )}

                {isConnected &&
                  loadingEscrows && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Loading your escrows...
                    </div>
                  )}

                {isConnected &&
                  !loadingEscrows &&
                  myEscrows.length === 0 && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                      <p className="text-sm text-slate-400">
                        No escrows yet
                      </p>

                      <p className="text-xs text-slate-600 mt-1">
                        Create your first escrow.
                      </p>
                    </div>
                  )}

                {!loadingEscrows &&
                  myEscrows.map(
                    (escrow) => {
                      const isSelected =
                        escrow.id ===
                        escrowId;

                      return (
                        <button
                          key={escrow.id}
                          onClick={() =>
                            selectEscrow(
                              escrow
                            )
                          }
                          className={`w-full text-left rounded-xl border p-4 mb-2 transition ${
                            isSelected
                              ? "border-violet-500/50 bg-violet-500/[0.08]"
                              : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04]"
                          }`}
                        >

                          <div className="flex items-center justify-between gap-2">

                            <span className="text-sm font-semibold">
                              Escrow #{escrow.id}
                            </span>

                            <StatusBadge
                              escrow={escrow}
                              small
                            />

                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">

                            <HistoryValue
                              label="Amount"
                              value={`${formatUnits(
                                escrow.amount,
                                6
                              )} USDC`}
                            />

                            <HistoryValue
                              label="Seller"
                              value={shortAddress(
                                escrow.seller
                              )}
                            />

                            <HistoryValue
                              label="Deadline"
                              value={formatDate(
                                escrow.deadline
                              )}
                            />

                            <HistoryValue
                              label="Time"
                              value={formatRemaining(
                                escrow.deadline
                              )}
                              highlight={
                                escrow.status ===
                                  1 &&
                                isExpired(
                                  escrow.deadline
                                )
                              }
                            />

                          </div>
                        </button>
                      );
                    }
                  )}
              </div>
            </section>
          </aside>
        </div>

        {/* STATUS MESSAGE */}
        {message && (
          <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-xs text-violet-200">
            {message}
          </div>
        )}

        {/* TRANSACTION */}
        {txHash && (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Transaction
            </p>

            <p className="mt-2 text-[10px] text-slate-500 break-all">
              {txHash}
            </p>
          </div>
        )}

        {/* CONTRACT */}
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            Escrow Contract
          </p>

          <p className="mt-2 text-xs text-slate-500 break-all">
            {ESCROW_ADDRESS}
          </p>
        </div>

      </div>
    </main>
  );
}

/* ======================================================
   INPUT
   ====================================================== */

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition placeholder:text-slate-700"
      />
    </div>
  );
}

/* ======================================================
   FEATURE
   ====================================================== */

function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#080d18] p-5">
      <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

/* ======================================================
   INFO
   ====================================================== */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-xs sm:text-sm text-slate-200 break-all">
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   MINI INFO
   ====================================================== */

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/[0.05] p-3">
      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   HISTORY VALUE
   ====================================================== */

function HistoryValue({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] text-slate-600">
        {label}
      </p>

      <p
        className={`mt-0.5 text-[10px] truncate ${
          highlight
            ? "text-red-300"
            : "text-slate-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   STATUS BADGE
   ====================================================== */

function StatusBadge({
  escrow,
  small = false,
}: {
  escrow: EscrowItem;
  small?: boolean;
}) {
  const expired =
    escrow.status === 1 &&
    isExpired(escrow.deadline);

  let className =
    "bg-violet-500/10 text-violet-300";

  if (expired) {
    className =
      "bg-red-500/10 text-red-300";
  } else if (escrow.status === 1) {
    className =
      "bg-yellow-500/10 text-yellow-300";
  } else if (escrow.status === 2) {
    className =
      "bg-blue-500/10 text-blue-300";
  } else if (escrow.status === 3) {
    className =
      "bg-slate-500/10 text-slate-400";
  }

  return (
    <span
      className={`${small ? "text-[9px]" : "text-[10px]"} px-2 py-1 rounded-full ${className}`}
    >
      {STATUS_LABELS[escrow.status] ??
        "Unknown"}
    </span>
  );
}

/* ======================================================
   HELPERS
   ====================================================== */

function shortAddress(address: string) {
  if (!address) return "-";

  return `${address.slice(
    0,
    6
  )}...${address.slice(-4)}`;
}

function formatDate(
  timestamp: bigint
) {
  return new Date(
    Number(timestamp) * 1000
  ).toLocaleString();
}

function isExpired(
  timestamp: bigint
) {
  return (
    BigInt(
      Math.floor(
        Date.now() / 1000
      )
    ) >= timestamp
  );
}

function formatRemaining(
  timestamp: bigint
) {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  const target =
    Number(timestamp);

  const diff =
    target - now;

  if (diff <= 0) {
    return "Expired";
  }

  const seconds =
    diff;

  const minutes =
    Math.floor(
      seconds / 60
    );

  const hours =
    Math.floor(
      minutes / 60
    );

  const days =
    Math.floor(
      hours / 24
    );

  if (days > 0) {
    return `${days}d ${
      hours % 24
    }h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${
      minutes % 60
    }m remaining`;
  }

  if (minutes > 0) {
    return `${minutes}m ${
      seconds % 60
    }s remaining`;
  }

  return `${seconds}s remaining`;
}