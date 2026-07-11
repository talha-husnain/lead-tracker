"use client";
import { useStore } from "@/lib/store";
import { AuthScreen } from "./AuthScreen";
import { AppShell } from "./AppShell";
import { Target } from "lucide-react";

export function AppRoot() {
  const { ready, mode, signedIn } = useStore();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-5">
          <div className="pulse-ring grid size-14 place-items-center rounded-[20px] bg-primary text-primary-foreground">
            <Target className="size-7" />
          </div>
          <div className="h-1 w-36 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/3 rounded-full bg-primary" style={{ animation: "flow 1.2s ease-in-out infinite" }} />
          </div>
          <div className="font-display text-sm font-semibold tracking-tight text-muted-foreground">Loading<span className="text-primary">.</span></div>
        </div>
      </div>
    );
  }
  if (mode === "cloud" && !signedIn) return <AuthScreen />;
  return <AppShell />;
}
