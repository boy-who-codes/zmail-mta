"use client";

import { WindowManagerProvider } from "../context/WindowManagerContext";
import { Desktop } from "../components/os/Desktop";

export default function Home() {
  return (
    <WindowManagerProvider>
      <Desktop />
    </WindowManagerProvider>
  );
}
