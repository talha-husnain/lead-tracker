"use client";
import { useUi } from "./ui-context";
import { Dialog, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ROWS = [
  ["N", "New lead"],
  ["/", "Search"],
  ["Ctrl / ⌘ + K", "Command palette"],
  ["1 · 2 · 3 · 4", "Dashboard · Leads · Board · Reports"],
  ["?", "This help"],
  ["Esc", "Close"],
];

export function HelpDialog() {
  const ui = useUi();
  return (
    <Dialog open onClose={ui.closeHelp} size="sm">
      <DialogTitle>Keyboard shortcuts</DialogTitle>
      <div className="mt-4 space-y-2.5">
        {ROWS.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-semibold">{k}</kbd>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
      <DialogFooter><Button onClick={ui.closeHelp}>Got it</Button></DialogFooter>
    </Dialog>
  );
}
