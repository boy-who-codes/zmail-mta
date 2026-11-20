"use client";

import { WindowManagerProvider } from "../context/WindowManagerContext";
import { TourProvider } from "../context/TourContext";
import { Desktop } from "../components/os/Desktop";

export default function Home() {
  return (
    <TourProvider>
      <WindowManagerProvider>
        <Desktop />
      </WindowManagerProvider>
    </TourProvider>
  );
}
