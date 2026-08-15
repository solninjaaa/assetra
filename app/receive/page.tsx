"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import QRCode from "react-qr-code";

const ARC_CHAIN_ID = 5042002;

export default function ReceivePage() {
  const { address, isConnected } = useAccount();

  const [copied, setCopied] = useState(false);

  const walletAddress = address ?? "";

  async function copyAddress() {
    if (!walletAddress) return;

    await navigator.clipboard.writeText(walletAddress);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  function shortAddress(value: string) {
    if (!value) return "Wallet not connected";

    return `${value.slice(0, 10)}...${value.slice(-8)}`;
  }

  return (
    <main className="min-h-screen bg-[#030910] text-white">
      <div className="mx-auto max-w-3xl p-4 lg:p-8">

        {/* HEADER */}
        <div className="mb-8 flex items-start gap-4">

          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#07101a] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">
              Receive USDC
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Receive USDC directly into your connected wallet on Arc Testnet.
            </p>
          </div>

        </div>

        {/* MAIN CARD */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#07101a] p-5 sm:p-7">

          {/* WALLET STATUS */}
          <div className="rounded-xl border border-white/[0.06] bg-[#030910] p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/20">
                <Wallet
                  size={18}
                  className="text-violet-400"
                />
              </div>

              <div className="min-w-0">

                <p className="text-[10px] text-slate-500">
                  Connected Wallet
                </p>

                <p className="mt-1 break-all font-mono text-sm font-semibold">
                  {isConnected
                    ? shortAddress(walletAddress)
                    : "Wallet not connected"}
                </p>

              </div>

              {isConnected && (
                <span className="ml-auto shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] text-emerald-400">
                  Connected
                </span>
              )}

            </div>

          </div>

          {/* NOT CONNECTED */}
          {!isConnected ? (

            <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-600/10 p-6 text-center">

              <Wallet
                size={30}
                className="mx-auto text-violet-400"
              />

              <p className="mt-4 text-sm font-semibold">
                Connect your wallet
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Connect your wallet to generate your Arc Testnet
                receiving address.
              </p>

              <button
                onClick={() =>
                  window.dispatchEvent(new Event("open-wallet"))
                }
                className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-semibold transition hover:opacity-90"
              >
                Connect Wallet
              </button>

            </div>

          ) : (

            <>
              {/* QR CODE */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#030910] p-6">

                <div className="text-center">

                  <p className="text-xs font-semibold">
                    Scan to Receive
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    Send USDC to this wallet address
                  </p>

                </div>

                <div className="mx-auto mt-6 flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-white p-4">

                  <QRCode
                    value={walletAddress}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />

                </div>

              </div>

              {/* ADDRESS */}
              <div className="mt-5">

                <label className="mb-2 block text-xs font-medium">
                  Your Wallet Address
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#030910] p-2">

                  <div className="min-w-0 flex-1 px-3 py-2">

                    <p className="break-all font-mono text-[11px] leading-5 text-slate-300">
                      {walletAddress}
                    </p>

                  </div>

                  <button
                    onClick={copyAddress}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-violet-600/15 px-3 text-[10px] font-semibold text-violet-400 transition hover:bg-violet-600/25"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>

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
                  Chain {ARC_CHAIN_ID}
                </span>

              </div>

              {/* WARNING */}
              <div className="mt-5 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.05] p-4">

                <p className="text-xs font-semibold text-yellow-400">
                  ⚠ Send only supported assets
                </p>

                <p className="mt-2 text-[10px] leading-5 text-slate-500">
                  Make sure the sender is using Arc Testnet.
                  Sending assets on the wrong network may result
                  in permanent loss.
                </p>

              </div>

              {/* ARC SCAN */}
              <a
                href={`https://testnet.arcscan.app/address/${walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                View Wallet on ArcScan
                <ExternalLink size={14} />
              </a>

            </>
          )}

          {/* FOOTER */}
          <p className="mt-6 text-center text-[9px] leading-4 text-slate-600">
            Assetra never holds your funds. Your connected wallet remains
            fully under your control.
          </p>

        </div>
      </div>
    </main>
  );
}