// Updated by Hamiltion23 at 2025-11-05 16:13
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Image from "next/image";
import { ConnectWalletTopRight } from "@/components/ConnectWalletTopRight";

// Enhanced
export const metadata: Metadata = {
  title: "Shield Trade Loop",
  description: "Private swap MVP on FHEVM",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`zama-bg text-foreground antialiased`}>
        <div className="fixed inset-0 w-full h-full zama-bg z-[-20]"></div>
        <main className="flex flex-col max-w-screen-lg mx-auto pb-20 px-3 md:px-0">
          <Providers>
            <nav className="flex w-full px-3 md:px-0 h-fit py-6 justify-between items-center">
              <div className="flex items-center gap-3">
                <Image
                  src="/shield-logo.svg"
                  alt="Shield Trade"
                  width={140}
                  height={140}
                  style={{ width: "auto", height: "auto" }}
                  priority
                  sizes="(max-width: 768px) 140px, 140px"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ConnectWalletTopRight />
              </div>
            </nav>
            {children}
          </Providers>
        </main>
      </body>
    </html>
  );
}

