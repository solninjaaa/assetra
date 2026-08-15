import {
  createSwapKitContext,
  getSupportedChains,
} from "@circle-fin/swap-kit";

export const swapKit = createSwapKitContext();

export const arcChain = getSupportedChains(swapKit).find(
  (chain) => chain.chain === "Arc_Testnet"
);

export const arcTokens = swapKit.tokens
  .entries()
  .filter((token) => token.locators?.Arc_Testnet);

export const getArcToken = (symbol: string) => {
  return arcTokens.find((token) => token.symbol === symbol);
};