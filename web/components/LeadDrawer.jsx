"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge, Dot } from "@/components/ui/badge";
import { Avatar } from "./bits";
import {
  statusById, prioById, firstTerminal, relDays, fmtDate, fmtDateTime,
  addDaysStr, todayStr, nowISO, uid, fmtMoney, hexA,
} from "@/lib/helpers";
import { X, Mail, ExternalLink, Pencil, Trophy, Trash2 } from "lucide-react";

export function LeadDrawer({ id }) {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const [note, setNote] = useState("");

  const open = !!id;
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") ui.closeDetail(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, ui]);

  if (!open || typeof document === "undefined") return null;
  const l = db.leads.find((x) => x.id === id);
  if (!l) return null;

  const st = statusById(db.statuses, l.status);
  const pr = prioById(l.priority);

  const mutate = (fn) => actions.update((d) => { const x = d.leads.find((y) => y.id === id); if (x) fn(x, d); });
  const setStatus = (val) => mutate((x, d) => { x.status = val; x.updatedAt = nowISO(); if (statusById(d.statuses, val).terminal) x.closedAt = nowISO(); });
  const setFollowup = (v) => mutate((x) => { x.nextFollowUp = v; x.updatedAt = nowISO(); });
  const addNote = () => {
    if (!note.trim()) return;
    mutate((x) => { x.notes.unshift({ id: uid(), text: note.trim(), at: nowISO() }); x.updatedAt = nowISO(); });
    setNote("");
  };
  const delNote = (nid) => mutate((x) => { x.notes = x.notes.filter((n) => n.id !== nid); });
  const remove = () => {
    const idx = db.leads.findIndex((x) => x.id === id);
    const snapshot = db.leads[idx];
    actions.update((d) => { d.leads = d.leads.filter((x) => x.id !== id); });
    ui.closeDetail();
    toast(`Deleted “${l.name || "lead"}”.`, { label: "Undo", onClick: () => actions.update((d) => { d.leads.splice(Math.min(idx, d.leads.length), 0, snapshot); }) });
  };

  const d = relDays(l.nextFollowUp);

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) ui.closeDetail(); }}>
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden border-l bg-card shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="relative border-b p-5">
          <button onClick={ui.closeDetail} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close"><X className="size-4" /></button>
          <div className="flex items-center gap-3">
            <Avatar name={l.name} size={44} />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{l.name || "Untitled lead"}</div>
              <div className="truncate text-sm text-muted-foreground">{[l.title, l.company].filter(Boolean).join(" · ") || "No company"}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge style={{ backgroundColor: hexA(st.color, 0.14), color: st.color, borderColor: hexA(st.color, 0.3) }}><Dot color={st.color} /> {st.label}</Badge>
            <Badge style={{ backgroundColor: hexA(pr.color, 0.14), color: pr.color, borderColor: hexA(pr.color, 0.3) }}><Dot color={pr.color} /> {pr.label}</Badge>
            {l.value ? <Badge className="text-green-600 dark:text-green-400">{fmtMoney(l.value)}</Badge> : null}
            {(l.tags || []).map((t) => <Badge key={t} className="text-muted-foreground">#{t}</Badge>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => ui.openEmail(l.id)}><Mail className="size-3.5" /> Follow-up email</Button>
            {l.sourceUrl && <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><ExternalLink className="size-3.5" /> {l.source || "Link"}</a>}
            <Button variant="outline" size="sm" onClick={() => ui.openForm(l)}><Pencil className="size-3.5" /> Edit</Button>
            {!st.terminal && <Button variant="outline" size="sm" onClick={() => ui.openTerminal(l.id, "won")}><Trophy className="size-3.5" /> Won</Button>}
            {!st.terminal && <Button variant="outline" size="sm" onClick={() => ui.openTerminal(l.id, "lost")}>Lost</Button>}
            <Button variant="outline" size="sm" onClick={remove}><Trash2 className="size-3.5" /> Delete</Button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick update</h4>
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">Status</span>
              <Select value={l.status} onChange={(e) => setStatus(e.target.value)} className="h-8">{db.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">Follow-up</span>
              <Input type="date" value={l.nextFollowUp || ""} onChange={(e) => setFollowup(e.target.value)} className="h-8" />
              {l.nextFollowUp && d <= 0 && <span className={"whitespace-nowrap text-xs font-semibold " + (d < 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>{d < 0 ? `${-d}d overdue` : "Today"}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 pl-24">
              {[["Today", todayStr()], ["+3d", addDaysStr(todayStr(), 3)], ["+1wk", addDaysStr(todayStr(), 7)], ["+2wk", addDaysStr(todayStr(), 14)]].map(([lbl, val]) => (
                <button key={lbl} onClick={() => setFollowup(val)} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">{lbl}</button>
              ))}
              <button onClick={() => setFollowup("")} className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">Clear</button>
            </div>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h4>
            <Row k="Email" v={l.email ? <a className="text-primary hover:underline" href={`mailto:${l.email}`}>{l.email}</a> : "—"} />
            <Row k="Phone" v={l.phone || "—"} />
            {l.project && <Row k="Project" v={l.project} />}
            <Row k="Source" v={l.source || "—"} />
            <Row k="Added" v={fmtDate(l.createdAt)} />
            <Row k="Updated" v={fmtDate(l.updatedAt)} />
          </section>

          {(l.links || []).length > 0 && (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</h4>
              <div className="flex flex-wrap gap-1.5">
                {l.links.map((lk, i) => (
                  <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}><ExternalLink className="size-3.5" /> {lk.label || lk.url}</a>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes &amp; follow-ups</h4>
            <div className="space-y-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add meeting notes, next steps, what to follow up on…" className="min-h-[64px]" />
              <Button size="sm" onClick={addNote}>+ Add note</Button>
            </div>
            {(l.notes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {l.notes.map((n) => (
                  <div key={n.id} className="border-l-2 border-primary/60 pl-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {fmtDateTime(n.at)}
                      <button onClick={() => delNote(n.id)} className="hover:text-destructive">delete</button>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{n.text}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center gap-2 border-b py-2 text-sm last:border-0">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="min-w-0 flex-1">{v}</span>
    </div>
  );
}
