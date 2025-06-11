"use client";

import { HuddleClient, HuddleProvider } from "@huddle01/react";
import { ReactNode } from "react";

const huddleClient = new HuddleClient({
  projectId: process.env.NEXT_PUBLIC_HUDDLE_PROJECT_ID || "",
  options: {
    activeSpeakers: {
      size: 8,
    },
  },
});

export function HuddleProviders(props: { children: ReactNode }) {
  return (
    <HuddleProvider client={huddleClient}>
        {props.children}
    </HuddleProvider>
  );
}