"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import { http } from "viem";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

export const arcTestnet = defineChain({
  id: 5042002,
  caipNetworkId: "eip155:5042002",
  chainNamespace: "eip155",

  name: "Arc Testnet",

  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },

  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },

  testnet: true,
});

/*
 * IMPORTANT:
 * AppKit expects at least one AppKitNetwork.
 * Keeping this as a tuple fixes the TypeScript error.
 */
const networks = [arcTestnet] as [
  typeof arcTestnet,
  ...typeof arcTestnet[]
];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: projectId || "",
  ssr: true,

  transports: {
    [arcTestnet.id]: http(
      "https://rpc.testnet.arc.io"
    ),
  },
});

createAppKit({
  adapters: [wagmiAdapter],

  networks,

  projectId: projectId || "",

  defaultNetwork: arcTestnet,

  allowUnsupportedChain: true,

  metadata: {
    name: "Assetra",
    description:
      "Assetra — on-chain portfolio intelligence",
    url: "http://localhost:3000",
    icons: [],
  },

  enableNetworkSwitch: true,
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () => new QueryClient()
  );

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}