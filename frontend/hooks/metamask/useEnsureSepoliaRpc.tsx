"use client";

import { useEffect, useRef } from "react";
import { ethers } from "ethers";

type AddChainParams = {
  chainId: `0x${string}`;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
};

// Quick JSON-RPC probe to detect CORS/network availability from the page context.
async function probeRpc(url: string, timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      mode: "cors",
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return Boolean(json && json.result);
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function useEnsureSepoliaRpc(parameters: {
  provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
}) {
  const { provider, chainId } = parameters;
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!provider || chainId !== 11155111) return;
    if (attemptedRef.current) return;

    const run = async () => {
      // Quick health check on current wallet RPC by asking latest block
      try {
        await provider.request({ method: "eth_blockNumber" });
        return; // Healthy, nothing to do
      } catch (e) {
        console.warn("[useEnsureSepoliaRpc] Wallet RPC appears unhealthy:", e);
      }

      // Build candidate public RPCs; allow env override first
      const envUrl = (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "").trim();
      const candidates = unique(
        [
          envUrl,
          "https://rpc.sepolia.org",
          "https://ethereum-sepolia-rpc.publicnode.com",
          "https://endpoints.omniatech.io/v1/eth/sepolia/public",
          "https://rpc.ankr.com/eth_sepolia",
          // Keep Infura last as it may be blocked regionally
          "https://sepolia.infura.io/v3/8f7d90378a814251afabcf6425269276",
        ].filter((u) => u)
      );

      let working: string | undefined;
      for (const url of candidates) {
        // Probe from page context, not MetaMask, just to choose a likely-good URL
        // (MetaMask still asks user to approve adding the network)
        // eslint-disable-next-line no-await-in-loop
        const ok = await probeRpc(url);
        if (ok) {
          working = url;
          break;
        }
      }

      if (!working) {
        console.warn("[useEnsureSepoliaRpc] No public Sepolia RPC responded; skip add/switch.");
        return;
      }

      const params: AddChainParams = {
        chainId: "0xaa36a7",
        chainName: "Sepolia (Fallback RPC)",
        nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
        rpcUrls: [working],
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      };

      // Try to switch first (in case user already has Sepolia added)
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: params.chainId }],
        });
      } catch (switchErr: any) {
        // 4902: Unrecognized chain; add it
        if (switchErr?.code === 4902) {
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [params],
            });
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: params.chainId }],
            });
          } catch (addErr) {
            console.warn("[useEnsureSepoliaRpc] add/switch failed:", addErr);
          }
        } else {
          console.warn("[useEnsureSepoliaRpc] switch failed:", switchErr);
        }
      }
    };

    attemptedRef.current = true;
    run();
  }, [provider, chainId]);
}

