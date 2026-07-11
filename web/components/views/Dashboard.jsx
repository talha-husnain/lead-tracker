"use client";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, FollowupPill } from "../bits";
import { Dot } from "@/components/ui/badge";
import { isOpenLead, statusById, relDays, fmtMoney, fmtDate, monthKey } from "@/lib/helpers";
import { sampleLeads } from "@/lib/sample";
import { cn } from "@/lib/utils";
import { Plus, Sparkles } from "lucide-react";

export function Dashboard() {
  const { db, actions } = useStore();
  const ui = useUi();
  const { leads, statuses, settings } = db;

  if (leads.length === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-2xl">🎯</div>
            <h2 className="text-xl font-semibold">Welcome to your Lead Tracker</h2>
            <p className="mt-2 text-sm text-muted-foreground">Capture every lead, never miss a follow-up, and watch deals move from first contact to won.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={() => ui.openForm(null)}><Plus className="size-4" /> Add your first lead</Button>
              <Button variant="outline" onClick={() => actions.update((d) => { d.leads = sampleLeads(); })}><Sparkles className="size-4" /> Load sample data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const open = leads.filter((l) => isOpenLead(statuses, l));
  const due = open.filter((l) => { const d = relDays(l.nextFollowUp); return d !== null && d <= 0; });
  const week = leads.filter((l) => { const d = relDays(l.nextFollowUp); return d !== null && d >= 0 && d <= 7; });
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won");
  const lost = leads.filter((l) => statusById(statuses, l.status).terminal === "lost");
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
  const pipeVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const wonVal = won.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const kpis = [
    { label: "Open Leads", value: open.length, sub: `${leads.length} total`, tone: "primary" },
    { label: "Follow-ups Due", value: due.length, sub: due.length ? "Needs attention today" : "All caught up 🎉", tone: due.length ? "danger" : "good" },
    { label: "Due This Week", value: week.length, sub: "Next 7 days", tone: "warn" },
    { label: "Pipeline Value", value: fmtMoney(pipeVal), sub: "Open opportunities", tone: "primary" },
    { label: "Won", value: won.length, sub: `${winRate}% win rate · ${fmtMoney(wonVal)}`, tone: "good" },
  ];
  const toneBar = { primary: "bg-primary", danger: "bg-destructive", good: "bg-green-600", warn: "bg-amber-500" };

  const attention = open.filter((l) => l.nextFollowUp)
    .sort((a, b) => (relDays(a.nextFollowUp) ?? 1e9) - (relDays(b.nextFollowUp) ?? 1e9)).slice(0, 7);

  const maxCount = Math.max(1, ...statuses.map((s) => leads.filter((l) => l.status === s.id).length));

  const goal = settings.goal || 0;
  const wonThisMonth = won.filter((l) => monthKey(l.closedAt || l.updatedAt) === monthKey(new Date().toISOString()))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);
  const goalPct = goal ? Math.min(100, Math.round((wonThisMonth / goal) * 100)) : 0;

  const acts = [];
  leads.forEach((l) => (l.notes || []).forEach((n) => acts.push({ l, n })));
  acts.sort((a, b) => new Date(b.n.at) - new Date(a.n.at));
  const recent = acts.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {due.length ? `You have ${due.length} follow-up${due.length > 1 ? "s" : ""} to send today.` : "You're all caught up."}
          </p>
        </div>
        <Button onClick={() => ui.openForm(null)}><Plus className="size-4" /> Add Lead</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0 w-1", toneBar[k.tone])} />
            <CardContent className="p-4 pt-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {goal > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly goal</div>
            <div className="text-lg font-semibold tabular-nums">{fmtMoney(wonThisMonth)}</div>
            <div className="text-sm text-muted-foreground">of {fmtMoney(goal)}</div>
            <div className="h-2.5 min-w-[160px] flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="text-sm font-semibold tabular-nums">{goalPct}%</div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">⏰ Needs attention</div>
            {attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled. Open a lead and set a next follow-up date.</p>
            ) : (
              <div className="divide-y">
                {attention.map((l) => (
                  <button key={l.id} onClick={() => ui.openDetail(l.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80">
                    <Avatar name={l.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name || "Untitled lead"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {statusById(statuses, l.status).label}{l.company ? ` · ${l.company}` : ""}
                      </div>
                    </div>
                    <FollowupPill date={l.nextFollowUp} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline breakdown</div>
            <div className="space-y-2.5">
              {statuses.map((s) => {
                const n = leads.filter((l) => l.status === s.id).length;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="flex w-36 shrink-0 items-center gap-2 text-sm">
                      <Dot color={s.color} /> <span className="truncate">{s.label}</span>
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(n / maxCount) * 100}%`, backgroundColor: s.color, minWidth: n ? 4 : 0 }} />
                    </div>
                    <div className="w-6 text-right text-sm font-semibold tabular-nums">{n}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {recent.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</div>
            <div className="divide-y">
              {recent.map(({ l, n }, i) => (
                <button key={i} onClick={() => ui.openDetail(l.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80">
                  <Avatar name={l.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.name || "Lead"}</div>
                    <div className="truncate text-xs text-muted-foreground">{n.text}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">{fmtDate(n.at)}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
