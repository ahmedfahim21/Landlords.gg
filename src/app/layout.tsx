import type { Metadata } from "next";
// import '@coinbase/onchainkit/styles.css';
import "./globals.css";
import { OnChainProviders } from "@/providers/onchain-provider";
import { HuddleProviders } from "@/providers/huddle-provider";

export const metadata: Metadata = {
  title: "Landlords.gg",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <OnChainProviders>
            <HuddleProviders>
              {children}
            </HuddleProviders>  
        </OnChainProviders>
      </body>
    </html>
  );
}
