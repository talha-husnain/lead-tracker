"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Ring } from "@/components/ui/ring";
import { Sparkline } from "@/components/ui/sparkline";
import { Avatar, FollowupPill } from "../bits";
import { Dot } from "@/components/ui/badge";
import { isOpenLead, statusById, relDays, fmtMoney, fmtDate, monthKey } from "@/lib/helpers";
import { activityStreak, addedThisWeek, createdPerDay } from "@/lib/insights";
import { sampleLeads } from "@/lib/sample";
import { cn } from "@/lib/utils";
import { Plus, Sparkles, Users, AlarmClock, CalendarDays, DollarSign, Trophy, Flame, TrendingUp } from "lucide-react";

export function Dashboard() {
  const { db, actions } = useStore();
  const ui = useUi();
  const { leads, statuses, settings } = db;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (leads.length === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-2xl">🎯</div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Welcome to your Lead Tracker<span className="text-primary">.</span></h2>
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
    { label: "Open Leads", num: open.length, sub: `${leads.length} total`, Icon: Users },
    { label: "Follow-ups Due", num: due.length, sub: due.length ? "Needs attention today" : "All caught up", accent: due.length > 0, Icon: AlarmClock },
    { label: "Due This Week", num: week.length, sub: "Next 7 days", Icon: CalendarDays },
    { label: "Pipeline Value", num: pipeVal, format: fmtMoney, sub: "Open opportunities", Icon: DollarSign },
    { label: "Won", num: won.length, sub: `${winRate}% win rate · ${fmtMoney(wonVal)}`, Icon: Trophy },
  ];

  const attention = open.filter((l) => l.nextFollowUp)
    .sort((a, b) => (relDays(a.nextFollowUp) ?? 1e9) - (relDays(b.nextFollowUp) ?? 1e9)).slice(0, 7);

  const maxCount = Math.max(1, ...statuses.map((s) => leads.filter((l) => l.status === s.id).length));

  const goal = settings.goal || 0;
  const wonThisMonth = won.filter((l) => monthKey(l.closedAt || l.updatedAt) === monthKey(new Date().toISOString()))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);
  const goalPct = goal ? Math.min(100, Math.round((wonThisMonth / goal) * 100)) : 0;
  const streak = activityStreak(leads);
  const addedWk = addedThisWeek(leads);

  const acts = [];
  leads.forEach((l) => (l.notes || []).forEach((n) => acts.push({ l, n })));
  acts.sort((a, b) => new Date(b.n.at) - new Date(a.n.at));
  const recent = acts.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard<span className="text-primary">.</span></h1>
          <p className="text-sm text-muted-foreground">
            {due.length ? `You have ${due.length} follow-up${due.length > 1 ? "s" : ""} to send today.` : "You're all caught up."}
          </p>
        </div>
        <Button onClick={() => ui.openForm(null)}><Plus className="size-4" /> Add Lead</Button>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="lift rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <k.Icon className={"size-4 " + (k.accent ? "text-primary" : "text-muted-foreground/40")} />
            </div>
            <div className={"mt-2 font-display text-[2rem] font-semibold leading-none tabular-nums " + (k.accent ? "text-primary" : "text-foreground")}>
              <CountUp value={k.num} format={k.format || ((n) => n)} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Flame className="size-5" /></div>
            <div>
              <div className="font-display text-2xl font-semibold tabular-nums">{streak}<span className="ml-1 text-sm font-medium text-muted-foreground">day{streak === 1 ? "" : "s"}</span></div>
              <div className="text-xs text-muted-foreground">Follow-up streak</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="size-5" /></div>
            <div className="flex-1">
              <div className="font-display text-2xl font-semibold tabular-nums">+{addedWk}</div>
              <div className="text-xs text-muted-foreground">Added this week</div>
            </div>
            <Sparkline data={createdPerDay(leads, 12)} width={72} height={30} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            {goal ? (
              <>
                <Ring value={wonThisMonth / goal} size={62} stroke={7}>
                  <span className="font-display text-xs font-bold tabular-nums">{goalPct}%</span>
                </Ring>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly goal</div>
                  <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">{fmtMoney(wonThisMonth)} <span className="text-muted-foreground">/ {fmtMoney(goal)}</span></div>
                  <div className="text-xs text-muted-foreground">{wonThisMonth >= goal ? "🎉 Goal hit!" : fmtMoney(goal - wonThisMonth) + " to go"}</div>
                </div>
              </>
            ) : (
              <button onClick={() => ui.openSettings()} className="flex items-center gap-3 text-left">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Trophy className="size-5" /></div>
                <div>
                  <div className="text-sm font-semibold">Set a monthly goal</div>
                  <div className="text-xs text-muted-foreground">Track revenue toward a target →</div>
                </div>
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-2">
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
                      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${mounted ? (n / maxCount) * 100 : 0}%`, backgroundColor: s.color, minWidth: n && mounted ? 4 : 0 }} />
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
