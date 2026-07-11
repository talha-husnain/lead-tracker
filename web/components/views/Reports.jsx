"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Button } from "@/components/ui/button";
import { isOpenLead, statusById, fmtMoney, monthKey } from "@/lib/helpers";
import { forecast, salesVelocity, avgDaysToClose, avgOpenAge, staleLeads, hottestLead } from "@/lib/insights";
import { Zap, Flame, AlertTriangle, ChevronRight, Target } from "lucide-react";

function Bar({ label, pct, color, val, mounted }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 truncate text-sm">{label}</div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${mounted ? pct : 0}%`, backgroundColor: color, minWidth: mounted ? 4 : 0 }} />
      </div>
      <div className="w-16 text-right text-sm font-semibold tabular-nums">{val}</div>
    </div>
  );
}

export function Reports() {
  const { db } = useStore();
  const ui = useUi();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { leads, statuses, settings } = db;

  const open = leads.filter((l) => isOpenLead(statuses, l));
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won");
  const lost = leads.filter((l) => statusById(statuses, l.status).terminal === "lost");
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
  const wonVal = won.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const avg = won.length ? Math.round(wonVal / won.length) : 0;
  const pipeVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const fc = forecast(leads, statuses);
  const vel = salesVelocity(leads, statuses);
  const atc = avgDaysToClose(leads, statuses);
  const age = avgOpenAge(leads, statuses);
  const stale = staleLeads(leads, statuses);
  const hot = hottestLead(leads, statuses);

  const kpis = [
    { label: "Pipeline value", num: pipeVal, format: fmtMoney },
    { label: "Won revenue", num: wonVal, format: fmtMoney },
    { label: "Win rate", num: winRate, format: (n) => n + "%" },
    { label: "Avg deal size", num: avg, format: fmtMoney },
  ];

  const funnelStages = statuses.filter((s) => !s.terminal || s.terminal === "won");
  const fMax = Math.max(1, ...funnelStages.map((s) => leads.filter((l) => l.status === s.id).length));

  const srcMap = {};
  leads.forEach((l) => { const k = l.source || "Other"; srcMap[k] = (srcMap[k] || 0) + 1; });
  const srcEntries = Object.entries(srcMap).sort((a, b) => b[1] - a[1]);
  const sMax = Math.max(1, ...srcEntries.map((e) => e[1]));

  const goal = settings.goal || 0;
  const wonThisMonth = won.filter((l) => monthKey(l.closedAt || l.updatedAt) === monthKey(new Date().toISOString()))
    .reduce((s, l) => s + (Number(l.value) || 0), 0);
  const goalPct = goal ? Math.min(100, Math.round((wonThisMonth / goal) * 100)) : 0;

  const base = new Date(); base.setDate(1);
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push({ key: dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"), label: dt.toLocaleDateString("en-US", { month: "short" }) });
  }
  const wonByMonth = {};
  won.forEach((l) => { const k = monthKey(l.closedAt || l.updatedAt); wonByMonth[k] = (wonByMonth[k] || 0) + (Number(l.value) || 0); });
  const mMax = Math.max(1, ...months.map((m) => wonByMonth[m.key] || 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reports<span className="text-primary">.</span></h1>
        <p className="text-sm text-muted-foreground">Your pipeline performance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="lift">
            <CardContent className="p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1.5 font-display text-3xl font-semibold tabular-nums"><CountUp value={k.num} format={k.format} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="lift"><CardContent className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Zap className="size-3.5 text-primary" /> Forecast</div>
          <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums"><CountUp value={fc} format={fmtMoney} /></div>
          <div className="mt-1 text-xs text-muted-foreground">pipeline × win rate</div>
        </CardContent></Card>
        <Card className="lift"><CardContent className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sales velocity</div>
          <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums"><CountUp value={vel} format={fmtMoney} /><span className="text-sm font-medium text-muted-foreground">/day</span></div>
          <div className="mt-1 text-xs text-muted-foreground">expected revenue/day</div>
        </CardContent></Card>
        <Card className="lift"><CardContent className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg days to close</div>
          <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{atc == null ? "—" : <CountUp value={atc} format={(n) => n + "d"} />}</div>
          <div className="mt-1 text-xs text-muted-foreground">won deals</div>
        </CardContent></Card>
        <Card className="lift"><CardContent className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg lead age</div>
          <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{age == null ? "—" : <CountUp value={age} format={(n) => n + "d"} />}</div>
          <div className="mt-1 text-xs text-muted-foreground">open leads</div>
        </CardContent></Card>
      </div>

      {(stale.length > 0 || hot) && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart nudges</div>
            <div className="space-y-2">
              {stale.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><AlertTriangle className="size-4" /></div>
                  <div className="flex-1 text-sm"><span className="font-semibold">{stale.length} stale lead{stale.length > 1 ? "s" : ""}</span> <span className="text-muted-foreground">— no activity in 14+ days.</span></div>
                  <Button size="sm" variant="outline" onClick={() => ui.openDetail(stale[0].id)}>Review</Button>
                </div>
              )}
              {hot && (
                <button onClick={() => ui.openDetail(hot.id)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left transition-colors hover:border-primary/40">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Flame className="size-4" /></div>
                  <div className="flex-1 truncate text-sm"><span className="font-semibold">Hottest lead:</span> {hot.name} <span className="text-muted-foreground">· {statusById(statuses, hot.status).label}{hot.value ? ` · ${fmtMoney(hot.value)}` : ""}</span></div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )}
              {goal > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Target className="size-4" /></div>
                  <div className="flex-1 text-sm"><span className="font-semibold">{goalPct}% to goal</span> <span className="text-muted-foreground">— {wonThisMonth >= goal ? "hit it! 🎉" : fmtMoney(goal - wonThisMonth) + " to go this month."}</span></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {goal > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly goal</div>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-2xl font-semibold tabular-nums">{fmtMoney(wonThisMonth)}</div>
              <div className="text-sm text-muted-foreground">of {fmtMoney(goal)}</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{goalPct}% of goal · {wonThisMonth >= goal ? "🎉 goal hit!" : fmtMoney(goal - wonThisMonth) + " to go"}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversion funnel</div>
            <div className="space-y-2.5">
              {funnelStages.map((s) => {
                const n = leads.filter((l) => l.status === s.id).length;
                return <Bar key={s.id} label={s.label} pct={(n / fMax) * 100} color={s.color} val={n} mounted={mounted} />;
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads by source</div>
            <div className="space-y-2.5">
              {srcEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                srcEntries.map(([k, v]) => <Bar key={k} label={k} pct={(v / sMax) * 100} color="hsl(var(--muted-foreground))" val={v} mounted={mounted} />)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Won revenue — last 6 months</div>
          <div className="flex items-end gap-3" style={{ height: 180 }}>
            {months.map((m) => {
              const v = wonByMonth[m.key] || 0;
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="text-[11px] font-semibold tabular-nums text-muted-foreground">{v ? "$" + Math.round(v / 1000) + "k" : ""}</div>
                  <div className="w-9 rounded-t-md bg-primary transition-[height] duration-700 ease-out" style={{ height: mounted ? Math.max(3, (v / mMax) * 130) : 3 }} />
                  <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
