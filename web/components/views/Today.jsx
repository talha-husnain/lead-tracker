"use client";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Avatar } from "../bits";
import { Button } from "@/components/ui/button";
import { isOpenLead, statusById, relDays, addDaysStr, todayStr, nowISO, uid } from "@/lib/helpers";
import { Check, Mail, ChevronRight } from "lucide-react";

export function Today() {
  const { db, actions } = useStore();
  const ui = useUi();
  const { leads, statuses } = db;

  const due = leads
    .filter((l) => isOpenLead(statuses, l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0)
    .sort((a, b) => relDays(a.nextFollowUp) - relDays(b.nextFollowUp));
  const upcoming = leads
    .filter((l) => { const d = relDays(l.nextFollowUp); return d !== null && d > 0 && d <= 7; })
    .sort((a, b) => relDays(a.nextFollowUp) - relDays(b.nextFollowUp));

  const done = (id) => actions.update((d) => {
    const l = d.leads.find((x) => x.id === id);
    if (!l) return;
    if (l.cadence > 0) {
      l.notes.unshift({ id: uid(), text: `✓ Followed up. Next in ${l.cadence}d.`, at: nowISO() });
      l.nextFollowUp = addDaysStr(todayStr(), l.cadence);
    } else {
      l.notes.unshift({ id: uid(), text: "✓ Followed up.", at: nowISO() });
      l.nextFollowUp = "";
    }
    l.updatedAt = nowISO();
  });
  const snooze = (id, days) => actions.update((d) => {
    const l = d.leads.find((x) => x.id === id);
    if (l) { l.nextFollowUp = addDaysStr(todayStr(), days); l.updatedAt = nowISO(); }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Today<span className="text-primary">.</span></h1>
        <p className="text-sm text-muted-foreground">
          {due.length ? `${due.length} follow-up${due.length > 1 ? "s" : ""} to handle — knock them out.` : "Nothing due — you're all caught up."}
        </p>
      </div>

      {due.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Check className="size-6" /></div>
          <div className="font-display text-lg font-semibold">All caught up<span className="text-primary">.</span></div>
          <p className="mt-1 text-sm text-muted-foreground">No follow-ups due today. Nice work.</p>
        </div>
      ) : (
        <div className="stagger space-y-2">
          {due.map((l) => {
            const d = relDays(l.nextFollowUp);
            return (
              <div key={l.id} className="lift flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar name={l.name} size={40} />
                <button onClick={() => ui.openDetail(l.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate font-semibold">{l.name || "Untitled"}</div>
                  <div className="truncate text-xs text-muted-foreground">{statusById(statuses, l.status).label}{l.company ? ` · ${l.company}` : ""}</div>
                </button>
                <span className={"whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold " + (d < 0 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
                  {d < 0 ? `${-d}d overdue` : "Today"}
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => done(l.id)}><Check className="size-3.5" /> Done</Button>
                  <Button size="sm" variant="outline" onClick={() => snooze(l.id, 1)}>+1d</Button>
                  <Button size="sm" variant="outline" onClick={() => snooze(l.id, 3)}>+3d</Button>
                  <Button size="sm" variant="ghost" onClick={() => ui.openEmail(l.id)} title="Follow-up email"><Mail className="size-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming · next 7 days</div>
          <div className="space-y-2">
            {upcoming.map((l) => (
              <button key={l.id} onClick={() => ui.openDetail(l.id)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40">
                <Avatar name={l.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.name || "Untitled"}</div>
                  <div className="truncate text-xs text-muted-foreground">{statusById(statuses, l.status).label}{l.company ? ` · ${l.company}` : ""}</div>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">in {relDays(l.nextFollowUp)}d</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
