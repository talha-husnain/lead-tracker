"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Dot } from "@/components/ui/badge";
import { FollowupPill } from "../bits";
import { statusById, prioById, fmtMoney, nowISO } from "@/lib/helpers";
import { cn } from "@/lib/utils";

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
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <p className="text-sm text-muted-foreground">Drag a card between columns to change its status.</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {statuses.map((s) => {
          const items = leads.filter((l) => l.status === s.id);
          return (
            <div
              key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(s.id); }}
              onDragLeave={() => setOverCol((c) => (c === s.id ? null : c))}
              onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, s.id); setOverCol(null); }}
              className={cn("flex max-h-[calc(100vh-190px)] w-72 shrink-0 flex-col rounded-xl border bg-muted/40", overCol === s.id && "ring-2 ring-primary")}
            >
              <div className="flex items-center gap-2 border-b px-3 py-2.5">
                <Dot color={s.color} />
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{items.length}</span>
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
                      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/50 active:cursor-grabbing"
                      style={{ borderLeft: `3px solid ${s.color}` }}
                    >
                      <div className="flex items-center gap-2">
                        <Dot color={p.color} />
                        <span className="text-sm font-semibold">{l.name || "Untitled"}</span>
                      </div>
                      {(l.company || l.project) && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{[l.company, l.project].filter(Boolean).join(" · ")}</div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {l.value ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">{fmtMoney(l.value)}</span> : null}
                        {l.nextFollowUp && <FollowupPill date={l.nextFollowUp} />}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
