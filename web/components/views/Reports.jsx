"use client";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { isOpenLead, statusById, fmtMoney, monthKey } from "@/lib/helpers";

function Bar({ label, pct, color, val }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 truncate text-sm">{label}</div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, minWidth: 4 }} />
      </div>
      <div className="w-16 text-right text-sm font-semibold tabular-nums">{val}</div>
    </div>
  );
}

export function Reports() {
  const { db } = useStore();
  const { leads, statuses, settings } = db;

  const open = leads.filter((l) => isOpenLead(statuses, l));
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won");
  const lost = leads.filter((l) => statusById(statuses, l.status).terminal === "lost");
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
  const wonVal = won.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const avg = won.length ? Math.round(wonVal / won.length) : 0;
  const pipeVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const kpis = [["Pipeline value", fmtMoney(pipeVal)], ["Won revenue", fmtMoney(wonVal)], ["Win rate", winRate + "%"], ["Avg deal size", fmtMoney(avg)]];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Your pipeline performance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([l, v]) => (
          <Card key={l}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                return <Bar key={s.id} label={s.label} pct={(n / fMax) * 100} color={s.color} val={n} />;
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
                srcEntries.map(([k, v]) => <Bar key={k} label={k} pct={(v / sMax) * 100} color="#4f46e5" val={v} />)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
