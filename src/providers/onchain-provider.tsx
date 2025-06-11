'use client';
 
import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base, baseSepolia } from 'wagmi/chains';
 
export function OnChainProviders(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} 
      chain={process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? base : baseSepolia}
    >
      {props.children}
    </OnchainKitProvider>
  );
}