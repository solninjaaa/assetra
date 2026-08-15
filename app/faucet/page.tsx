"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();

  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const openFaucet = () => {
    window.open(
      "https://faucet.circle.com/",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const goDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <main className="min-h-screen bg-[#03070d] text-white">
      {/* TOPBAR */}
      <header className="flex h-[72px] items-center border-b border-white/[0.06] bg-[#040a12] px-5 lg:px-7">
        <button
          type="button"
          onClick={goDashboard}
          className="flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 font-black">
            A
          </div>

          <span className="text-sm font-semibold">
            Assetra
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-14">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-400">
            Testnet Tools
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Arc Faucet
          </h1>

          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Get testnet USDC for experimenting with Assetra
            on Arc Testnet.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* FAUCET CARD */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#07101a]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-600/10 blur-3xl" />

            <div className="relative p-6 lg:p-7">
              {/* CARD HEADER */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20">
                    <span className="text-lg">
                      💧
                    </span>
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold">
                      Testnet USDC
                    </h2>

                    <p className="mt-1 text-[10px] text-slate-600">
                      Arc Testnet
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[9px] font-medium text-violet-400">
                  TESTNET
                </span>
              </div>

              {/* WALLET */}
              <div className="mt-7">
                <p className="mb-2 text-[10px] text-slate-600">
                  Your wallet
                </p>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#03070d] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500">
                      <Wallet size={14} />
                    </div>

                    <div className="min-w-0">
                      {isConnected && address ? (
                        <>
                          <p className="truncate text-xs font-medium">
                            {address.slice(0, 8)}...
                            {address.slice(-6)}
                          </p>

                          <p className="mt-0.5 text-[9px] text-emerald-400">
                            Wallet connected
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium">
                            Wallet not connected
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-600">
                            Connect your wallet first
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {isConnected && address && (
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      {copied ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* DETAILS */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
                  <p className="text-[9px] text-slate-600">
                    Network
                  </p>

                  <p className="mt-2 text-xs font-medium">
                    Arc Testnet
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
                  <p className="text-[9px] text-slate-600">
                    Token
                  </p>

                  <p className="mt-2 text-xs font-medium">
                    USDC
                  </p>
                </div>
              </div>

              {/* BUTTON */}
              <button
                type="button"
                onClick={openFaucet}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-xs font-semibold shadow-lg shadow-violet-900/20 transition hover:scale-[1.01] hover:opacity-95"
              >
                Get Test USDC
                <ExternalLink size={14} />
              </button>

              <p className="mt-3 text-center text-[9px] text-slate-600">
                Opens the official Circle Testnet Faucet
              </p>
            </div>
          </div>

          {/* INFO CARD */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#07101a] p-6 lg:p-7">
            <p className="text-xs font-semibold">
              How it works
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-[10px] font-semibold text-violet-400">
                  01
                </div>

                <div>
                  <p className="text-xs font-medium">
                    Connect your wallet
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-slate-600">
                    Assetra detects your connected Arc wallet.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-[10px] font-semibold text-violet-400">
                  02
                </div>

                <div>
                  <p className="text-xs font-medium">
                    Request testnet USDC
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-slate-600">
                    Use the official Circle faucet to request
                    test USDC.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-[10px] font-semibold text-violet-400">
                  03
                </div>

                <div>
                  <p className="text-xs font-medium">
                    Return to Assetra
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-slate-600">
                    Your dashboard balance will update after
                    the transaction confirms.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-white/[0.05] bg-[#03070d] p-4">
              <p className="text-[9px] leading-4 text-slate-600">
                Testnet USDC has no real-world financial value.
                It is only used for development and testing.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#07101a] px-5 py-3">
          <span className="text-[9px] text-slate-600">
            Assetra • Arc Testnet
          </span>

          <span className="text-[9px] text-slate-600">
            Non-custodial
          </span>
        </div>
      </div>
    </main>
  );
}