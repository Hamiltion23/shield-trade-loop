"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWalletTopRight() {
  return (
    <div className="flex items-center justify-end gap-2">
      <ConnectButton
        label="Connect Wallet"
        accountStatus="avatar"
        chainStatus="full"
        showBalance={false}
      />
    </div>
  );
}
