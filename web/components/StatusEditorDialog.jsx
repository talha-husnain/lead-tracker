"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uid } from "@/lib/helpers";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export function StatusEditorDialog() {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const [rows, setRows] = useState(() => db.statuses.map((s) => ({ ...s })));

  const set = (i, k, v) => setRows((arr) => arr.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i, dir) => setRows((arr) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = arr.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const del = (i) => setRows((arr) => (arr.length <= 2 ? arr : arr.filter((_, j) => j !== i)));
  const add = () => setRows((arr) => [...arr, { id: "st" + uid(), label: "New stage", color: "#6d5ef0" }]);

  const save = () => {
    const cleaned = rows.filter((r) => r.label.trim());
    if (cleaned.length < 2) { toast("Keep at least two stages."); return; }
    actions.update((d) => {
      const ids = new Set(cleaned.map((r) => r.id));
      d.leads.forEach((l) => { if (!ids.has(l.status)) l.status = cleaned[0].id; });
      d.statuses = cleaned;
    });
    toast("Pipeline saved.");
    ui.closeStatus();
  };

  return (
    <Dialog open onClose={ui.closeStatus} size="lg">
      <DialogTitle>Pipeline &amp; colors</DialogTitle>
      <DialogDescription>Rename stages, change colors, reorder, or add your own. Leads keep their stage when you rename it.</DialogDescription>
      <div className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <input type="color" value={r.color} onChange={(e) => set(i, "color", e.target.value)} className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
            <Input value={r.label} onChange={(e) => set(i, "label", e.target.value)} className="flex-1" />
            <Button variant="ghost" size="iconSm" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></Button>
            <Button variant="ghost" size="iconSm" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown className="size-3.5" /></Button>
            <Button variant="ghost" size="iconSm" onClick={() => del(i)}><Trash2 className="size-3.5" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={add}>+ Add stage</Button>
      <DialogFooter>
        <Button variant="outline" onClick={ui.closeStatus}>Cancel</Button>
        <Button onClick={save}>Save pipeline</Button>
      </DialogFooter>
    </Dialog>
  );
}
