"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { firstTerminal, todayStr, nowISO, uid, fmtMoney } from "@/lib/helpers";
import { fireConfetti } from "@/lib/confetti";

export function TerminalDialog({ payload }) {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const { id, kind } = payload;
  const lead = db.leads.find((l) => l.id === id);
  const [value, setValue] = useState(lead?.value || "");
  const [closedAt, setClosedAt] = useState(todayStr());
  const [reason, setReason] = useState("");
  if (!lead) return null;
  const won = kind === "won";

  const save = (e) => {
    e.preventDefault();
    actions.update((d) => {
      const l = d.leads.find((x) => x.id === id);
      if (!l) return;
      l.status = firstTerminal(d.statuses, kind);
      l.value = Number(value) || 0;
      l.closedAt = closedAt ? new Date(closedAt + "T00:00:00").toISOString() : nowISO();
      l.wonReason = reason.trim();
      if (won) l.nextFollowUp = "";
      l.notes.unshift({ id: uid(), text: `${won ? "Won" : "Lost"} — ${fmtMoney(l.value)}${reason.trim() ? ". " + reason.trim() : ""}`, at: nowISO() });
      l.updatedAt = nowISO();
    });
    toast(won ? "🎉 Marked as won!" : "Marked as lost.");
    if (won) fireConfetti();
    ui.closeTerminal();
  };

  return (
    <Dialog open onClose={ui.closeTerminal}>
      <DialogTitle>{won ? "🎉 Mark as Won" : "Mark as Lost"}</DialogTitle>
      <DialogDescription>{won ? "Capture the final details for your reports." : "Capture why — useful for reports and re-engaging later."}</DialogDescription>
      <form onSubmit={save} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{won ? "Final deal value ($)" : "Potential value ($)"}</Label><Input type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Closed date</Label><Input type="date" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>{won ? "What closed it? (optional)" : "Reason lost (optional)"}</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={won ? "e.g. Referral trust + fast turnaround" : "e.g. Budget / timing / chose a competitor"} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={ui.closeTerminal}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
