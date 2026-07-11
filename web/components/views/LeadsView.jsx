"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Avatar, PriorityTag, FollowupPill } from "../bits";
import { Dot } from "@/components/ui/badge";
import { PRIORITIES, SOURCES } from "@/lib/constants";
import { statusById, prioById, relDays, fmtMoney, hexA, nowISO, toCSV } from "@/lib/helpers";
import { Pencil, Trash2, ExternalLink } from "lucide-react";

export function LeadsView() {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const { leads, statuses } = db;

  const [selected, setSelected] = useState(() => new Set());
  const [fStatus, setFStatus] = useState("all");
  const [fPrio, setFPrio] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [sort, setSort] = useState("followup");

  const list = useMemo(() => {
    let out = leads.slice();
    const q = (ui.search || "").trim().toLowerCase();
    if (q) out = out.filter((l) => [l.name, l.email, l.company, l.title, l.project, l.source, (l.tags || []).join(" ")].join(" ").toLowerCase().includes(q));
    if (fStatus !== "all") out = out.filter((l) => l.status === fStatus);
    if (fPrio !== "all") out = out.filter((l) => l.priority === fPrio);
    if (fSource !== "all") out = out.filter((l) => l.source === fSource);
    const stOrder = {}; statuses.forEach((s, i) => (stOrder[s.id] = i));
    const prOrder = { hot: 0, warm: 1, cold: 2 };
    const rank = (l) => { const d = relDays(l.nextFollowUp); return d === null ? 1e9 : d; };
    const sorters = {
      followup: (a, b) => rank(a) - rank(b),
      updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      name: (a, b) => (a.name || "").localeCompare(b.name || ""),
      status: (a, b) => (stOrder[a.status] ?? 99) - (stOrder[b.status] ?? 99),
      priority: (a, b) => (prOrder[a.priority] ?? 9) - (prOrder[b.priority] ?? 9),
      value: (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0),
    };
    out.sort(sorters[sort] || sorters.followup);
    return out;
  }, [leads, statuses, ui.search, fStatus, fPrio, fSource, sort]);

  const changeStatus = (id, val) => actions.update((d) => {
    const l = d.leads.find((x) => x.id === id);
    if (!l) return;
    l.status = val; l.updatedAt = nowISO();
    if (statusById(d.statuses, val).terminal) l.closedAt = nowISO();
  });
  const removeLead = (id, name) => {
    const idx = leads.findIndex((x) => x.id === id);
    const snapshot = leads[idx];
    actions.update((d) => { d.leads = d.leads.filter((x) => x.id !== id); });
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    toast(`Deleted “${name || "lead"}”.`, { label: "Undo", onClick: () => actions.update((d) => { d.leads.splice(Math.min(idx, d.leads.length), 0, snapshot); }) });
  };

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisible = list.length > 0 && list.every((l) => selected.has(l.id));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (list.every((l) => n.has(l.id))) list.forEach((l) => n.delete(l.id));
    else list.forEach((l) => n.add(l.id));
    return n;
  });
  const bulkStatus = (val) => actions.update((d) => d.leads.forEach((l) => {
    if (selected.has(l.id)) { l.status = val; l.updatedAt = nowISO(); if (statusById(d.statuses, val).terminal) l.closedAt = nowISO(); }
  }));
  const bulkFollowup = (val) => actions.update((d) => d.leads.forEach((l) => { if (selected.has(l.id)) { l.nextFollowUp = val; l.updatedAt = nowISO(); } }));
  const bulkDelete = () => {
    if (!confirm(`Delete ${selected.size} selected lead${selected.size > 1 ? "s" : ""}?`)) return;
    const ids = selected;
    actions.update((d) => { d.leads = d.leads.filter((l) => !ids.has(l.id)); });
    toast(`${ids.size} deleted.`);
    setSelected(new Set());
  };
  const bulkExport = () => {
    const sel = leads.filter((l) => selected.has(l.id));
    const blob = new Blob([toCSV(sel, statuses)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lead-tracker-selection.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Leads<span className="text-primary">.</span></h1>
          <p className="text-sm text-muted-foreground">{list.length} shown · {leads.length} total</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-8 w-auto text-xs">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select value={fPrio} onChange={(e) => setFPrio(e.target.value)} className="h-8 w-auto text-xs">
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Select value={fSource} onChange={(e) => setFSource(e.target.value)} className="h-8 w-auto text-xs">
          <option value="all">All sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 w-auto text-xs">
            <option value="followup">Follow-up date</option>
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="value">Value</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-4 py-2.5"><input type="checkbox" checked={allVisible} onChange={toggleAll} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" /></th>
                <th className="px-4 py-2.5 text-left font-semibold">Name</th>
                <th className="px-4 py-2.5 text-left font-semibold">Contact</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold">Priority</th>
                <th className="px-4 py-2.5 text-left font-semibold">Value</th>
                <th className="px-4 py-2.5 text-left font-semibold">Follow-up</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No leads match your filters.</td></tr>
              )}
              {list.map((l) => {
                const st = statusById(statuses, l.status);
                return (
                  <tr key={l.id} className={"border-b transition-colors last:border-0 hover:bg-muted/40 " + (selected.has(l.id) ? "bg-primary/5" : "")}>
                    <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" /></td>
                    <td className="px-4 py-2.5">
                      <button className="flex items-center gap-3 text-left" onClick={() => ui.openDetail(l.id)}>
                        <Avatar name={l.name} size={34} />
                        <div className="min-w-0">
                          <div className="font-medium">{l.name || "Untitled"}</div>
                          {(l.company || l.project) && (
                            <div className="truncate text-xs text-muted-foreground">
                              {[l.title && l.company ? `${l.title} · ${l.company}` : l.company, l.project].filter(Boolean).join(" — ")}
                            </div>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      {l.email ? <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a> : <span className="text-muted-foreground">—</span>}
                      {l.sourceUrl && (
                        <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
                          {l.source}<ExternalLink className="size-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={l.status}
                        onChange={(e) => changeStatus(l.id, e.target.value)}
                        className="h-8 w-auto min-w-[130px] border-transparent text-xs font-semibold"
                        style={{ backgroundColor: hexA(st.color, 0.14), color: st.color }}
                      >
                        {statuses.map((s) => <option key={s.id} value={s.id} className="bg-card text-foreground">{s.label}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-2.5"><PriorityTag id={l.priority} /></td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtMoney(l.value)}</td>
                    <td className="px-4 py-2.5"><FollowupPill date={l.nextFollowUp} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="iconSm" title="Edit" onClick={() => ui.openForm(l)}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="iconSm" title="Delete" onClick={() => removeLead(l.id, l.name)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-lg">
          <span className="px-1 text-sm"><strong className="text-primary">{selected.size}</strong> selected</span>
          <Select defaultValue="" onChange={(e) => { if (e.target.value) { bulkStatus(e.target.value); e.target.value = ""; } }} className="h-8 w-auto text-xs">
            <option value="">Change status…</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">Follow-up
            <Input type="date" onChange={(e) => bulkFollowup(e.target.value)} className="h-8 w-auto" />
          </label>
          <Button variant="ghost" size="sm" onClick={bulkExport}>Export</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={bulkDelete}>Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
    </div>
  );
}
