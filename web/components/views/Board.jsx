"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Dot } from "@/components/ui/badge";
import { FollowupPill } from "../bits";
import { statusById, prioById, fmtMoney, nowISO } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { ChevronRight, GripVertical } from "lucide-react";

export function Board() {
  const { db, actions } = useStore();
  const ui = useUi();
  const { leads, statuses } = db;
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const move = (id, colId) => actions.update((d) => {
    const l = d.leads.find((x) => x.id === id);
    if (!l) return;
    l.status = colId; l.updatedAt = nowISO();
    if (statusById(d.statuses, colId).terminal) l.closedAt = nowISO();
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Board<span className="text-primary">.</span></h1>
        <p className="text-sm text-muted-foreground">Drag a card between columns to change its status.</p>
      </div>
      <div className="flex items-start gap-2 overflow-x-auto pb-4">
        {statuses.map((s, i) => {
          const items = leads.filter((l) => l.status === s.id);
          const column = (
            <div
              key={"col-" + s.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(s.id); }}
              onDragLeave={() => setOverCol((c) => (c === s.id ? null : c))}
              onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, s.id); setOverCol(null); }}
              className={cn(
                "flex max-h-[calc(100vh-200px)] w-72 shrink-0 flex-col rounded-lg border border-border bg-card transition-colors",
                overCol === s.id && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto p-2">
                {items.map((l) => {
                  const p = prioById(l.priority);
                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => ui.openDetail(l.id)}
                      className="group/card relative cursor-grab rounded-md border border-border bg-secondary p-3 transition-colors hover:border-primary/60 active:cursor-grabbing"
                      style={{ borderLeft: `3px solid ${s.color}` }}
                    >
                      <GripVertical className="absolute right-1.5 top-2 size-3.5 text-muted-foreground/30 transition-colors group-hover/card:text-muted-foreground/60" />
                      <div className="flex items-center gap-2 pr-4">
                        <Dot color={p.color} />
                        <span className="text-sm font-semibold">{l.name || "Untitled"}</span>
                      </div>
                      {(l.company || l.project) && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{[l.company, l.project].filter(Boolean).join(" · ")}</div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {l.value ? <span className="rounded border border-border px-1.5 py-0.5 text-xs font-semibold text-[hsl(var(--good))]">{fmtMoney(l.value)}</span> : null}
                        {l.nextFollowUp && <FollowupPill date={l.nextFollowUp} />}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <div className="rounded-xl border border-dashed border-border/60 py-5 text-center text-xs text-muted-foreground">Drop here</div>}
              </div>
            </div>
          );
          if (i === 0) return column;
          return [
            <div key={"arrow-" + s.id} className="flex shrink-0 items-center self-start pt-9">
              <span className="flow-line h-[2px] w-6 rounded-full bg-primary/25" />
              <ChevronRight className="-ml-1 size-4 text-primary" />
            </div>,
            column,
          ];
        })}
      </div>
    </div>
  );
}
