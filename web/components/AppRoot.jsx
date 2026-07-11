"use client";
import { useStore } from "@/lib/store";
import { AuthScreen } from "./AuthScreen";
import { AppShell } from "./AppShell";

export function AppRoot() {
  const { ready, mode, signedIn } = useStore();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading Lead Tracker…</div>
      </div>
    );
  }
  if (mode === "cloud" && !signedIn) return <AuthScreen />;
  return <AppShell />;
}
