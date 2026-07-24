"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";

export function CommandPalette() {
  const { db } = useStore();
  const ui = useUi();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  const commands = [
    { label: "➕ Add lead", run: () => ui.openForm(null) },
    { label: "📁 Add project", run: () => { ui.setTab("projects"); ui.openProjectForm(null); } },
    { label: "📊 Go to Dashboard", run: () => ui.setTab("dashboard") },
    { label: "📇 Go to Leads", run: () => ui.setTab("leads") },
    { label: "🗂 Go to Board", run: () => ui.setTab("board") },
    { label: "📂 Go to Projects", run: () => ui.setTab("projects") },
    { label: "📈 Go to Reports", run: () => ui.setTab("reports") },
    { label: "⚙ Settings", run: () => ui.openSettings() },
    { label: "🎨 Pipeline & colors", run: () => ui.openStatus() },
  ];
  const ql = q.trim().toLowerCase();
  const leadHits = (ql ? db.leads.filter((l) => (l.name + " " + l.company + " " + l.email).toLowerCase().includes(ql)) : db.leads.slice(0, 5))
    .slice(0, 6)
    .map((l) => ({ label: `👤 ${l.name || "Untitled"}${l.company ? " · " + l.company : ""}`, run: () => ui.openDetail(l.id) }));
  const cmdHits = commands.filter((c) => !ql || c.label.toLowerCase().includes(ql));
  const items = [...leadHits, ...cmdHits];

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t); }, []);

  const exec = (i) => { const it = items[i]; if (!it) return; ui.closePalette(); it.run(); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { setSel((s) => Math.min(s + 1, items.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setSel((s) => Math.max(s - 1, 0)); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
    else if (e.key === "Escape") { ui.closePalette(); }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) ui.closePalette(); }}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search leads or type a command…"
          className="w-full border-b bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No matches</div>
          ) : (
            items.map((it, i) => (
              <button
                key={i}
                onMouseEnter={() => setSel(i)}
                onClick={() => exec(i)}
                className={"flex w-full items-center rounded-md px-3 py-2 text-left text-sm " + (i === sel ? "bg-accent" : "")}
              >
                {it.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
