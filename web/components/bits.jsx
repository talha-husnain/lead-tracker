import { Badge, Dot } from "@/components/ui/badge";
import { statusById, prioById, relDays, fmtDate, initials, colorFor, hexA } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export function StatusBadge({ statuses, id }) {
  const s = statusById(statuses, id);
  return (
    <Badge style={{ backgroundColor: hexA(s.color, 0.14), color: s.color, borderColor: hexA(s.color, 0.3) }}>
      <Dot color={s.color} /> {s.label}
    </Badge>
  );
}

export function PriorityTag({ id }) {
  const p = prioById(id);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <Dot color={p.color} /> {p.label}
    </span>
  );
}

export function FollowupPill({ date }) {
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  const d = relDays(date);
  const cls =
    d < 0 ? "bg-destructive/15 text-destructive"
    : d === 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : "bg-muted text-muted-foreground";
  const txt = d < 0 ? `${-d}d overdue` : d === 0 ? "Today" : fmtDate(date);
  return <span className={cn("inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold", cls)}>{txt}</span>;
}

export function Avatar({ name, size = 36 }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ width: size, height: size, backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </div>
  );
}
