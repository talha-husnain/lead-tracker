"use client";
import { useStore } from "@/lib/store";
import { useUi } from "../ui-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { todayStr, fmtDate, nowISO, uid } from "@/lib/helpers";
import { Plus, Check, Pencil, Trash2, RotateCcw, FolderKanban, ChevronDown } from "lucide-react";

// The update record for today — its presence means "update taken today".
function todayUpdate(p) {
  return (p.updates || []).find((u) => u.date === todayStr());
}

export function Projects() {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const projects = db.projects || [];

  const active = projects.filter((p) => p.status !== "done");
  const done = projects.filter((p) => p.status === "done");
  const list = ui.projShowDone
    ? [...active, ...done]
    : active;

  const updatedToday = active.filter((p) => todayUpdate(p)).length;
  const pct = active.length ? Math.round((updatedToday / active.length) * 100) : 100;
  const allDone = active.length > 0 && updatedToday === active.length;

  // ---- mutations ----
  const setChecked = (id, checked) => actions.update((d) => {
    const p = d.projects.find((x) => x.id === id);
    if (!p) return;
    p.updates = p.updates || [];
    const has = p.updates.find((u) => u.date === todayStr());
    if (checked) {
      if (!has) p.updates.unshift({ id: uid(), date: todayStr(), comment: "", at: nowISO() });
    } else {
      p.updates = p.updates.filter((u) => u.date !== todayStr());
    }
    p.updatedAt = nowISO();
  });

  // Save today's comment; typing one when none is logged auto-marks the day.
  const setComment = (id, text) => actions.update((d) => {
    const p = d.projects.find((x) => x.id === id);
    if (!p) return;
    p.updates = p.updates || [];
    const val = text.trim();
    const u = p.updates.find((x) => x.date === todayStr());
    if (u) { u.comment = val; u.at = nowISO(); }
    else if (val) { p.updates.unshift({ id: uid(), date: todayStr(), comment: val, at: nowISO() }); }
    else return;
    p.updatedAt = nowISO();
  });

  const complete = (id) => { actions.update((d) => { const p = d.projects.find((x) => x.id === id); if (p) { p.status = "done"; p.updatedAt = nowISO(); } }); toast("Project marked complete."); };
  const reopen = (id) => actions.update((d) => { const p = d.projects.find((x) => x.id === id); if (p) { p.status = "active"; p.updatedAt = nowISO(); } });
  const remove = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!confirm(`Delete project “${p?.name || "project"}”? Its update history will be lost.`)) return;
    actions.update((d) => { d.projects = d.projects.filter((x) => x.id !== id); });
    toast("Project deleted.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Ongoing Projects<span className="text-primary">.</span></h1>
          <p className="text-sm text-muted-foreground">Take a daily update on every active project — tick it off and add an optional comment.</p>
        </div>
        <Button onClick={() => ui.openProjectForm(null)}><Plus className="size-4" /> Add Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><FolderKanban className="size-6" /></div>
          <div className="font-display text-lg font-semibold">No projects yet<span className="text-primary">.</span></div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add the projects you&apos;re actively working on. Each day you can mark that you&apos;ve taken an update and jot an optional comment.</p>
          <Button className="mt-4" onClick={() => ui.openProjectForm(null)}><Plus className="size-4" /> Add your first project</Button>
        </div>
      ) : (
        <>
          {/* daily progress summary */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="text-sm">
              <strong className="text-base">{updatedToday} / {active.length}</strong> active projects updated today{allDone ? " 🎉" : ""}
            </div>
            <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: pct + "%" }} />
            </div>
            {done.length > 0 && (
              <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={ui.projShowDone} onChange={(e) => ui.setProjShowDone(e.target.checked)} className="size-3.5 accent-primary" />
                Show completed ({done.length})
              </label>
            )}
          </div>

          <div className="stagger space-y-2">
            {list.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">No active projects. Add one, or show completed.</div>
            ) : (
              list.map((p) => (
                <ProjectCard
                  key={p.id} p={p}
                  onCheck={setChecked} onComment={setComment}
                  onComplete={complete} onReopen={reopen} onRemove={remove}
                  onEdit={() => ui.openProjectForm(p)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectCard({ p, onCheck, onComment, onComplete, onReopen, onRemove, onEdit }) {
  const done = p.status === "done";
  const tu = todayUpdate(p);
  const checked = !!tu;
  const history = (p.updates || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const last = history[0];
  const lastTxt = done ? "Completed" : last ? `Last update ${fmtDate(last.date)}` : "No updates logged yet";
  const count = (p.updates || []).length;

  return (
    <div className={"lift rounded-lg border bg-card p-3 " + (done ? "border-border/60 opacity-70" : checked ? "border-primary/40" : "border-border")}>
      <div className="flex flex-wrap items-center gap-3">
        {/* daily checkmark */}
        <label className={"grid size-9 shrink-0 place-items-center rounded-full border transition-colors " + (done ? "cursor-default border-border bg-secondary text-muted-foreground" : checked ? "cursor-pointer border-primary bg-primary text-primary-foreground" : "cursor-pointer border-border text-muted-foreground hover:border-primary/50")}
          title={done ? "Project completed" : "Mark today as updated"}>
          <input type="checkbox" className="sr-only" checked={checked} disabled={done} onChange={(e) => onCheck(p.id, e.target.checked)} />
          <Check className="size-4" />
        </label>

        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {p.name || "Untitled project"}
            {p.client ? <span className="font-normal text-muted-foreground"> · {p.client}</span> : null}
            {done ? <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Completed</span> : null}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {lastTxt} · {count} update{count === 1 ? "" : "s"} logged{p.description ? ` · ${p.description}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="iconSm" variant="ghost" title="Edit" onClick={onEdit}><Pencil className="size-3.5" /></Button>
          {done
            ? <Button size="iconSm" variant="ghost" title="Reopen" onClick={() => onReopen(p.id)}><RotateCcw className="size-3.5" /></Button>
            : <Button size="iconSm" variant="ghost" title="Mark complete" onClick={() => onComplete(p.id)}><Check className="size-3.5" /></Button>}
          <Button size="iconSm" variant="ghost" title="Delete" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(p.id)}><Trash2 className="size-3.5" /></Button>
        </div>
      </div>

      {/* today's optional comment */}
      {!done && (
        <div className="mt-2.5 flex items-center gap-2 pl-12">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</span>
          <CommentBox value={tu?.comment || ""} onSave={(v) => onComment(p.id, v)} />
        </div>
      )}

      {/* history */}
      {count > 0 && (
        <details className="group mt-2 pl-12">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            {count} update{count === 1 ? "" : "s"} logged — view history
          </summary>
          <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
            {history.map((u) => (
              <div key={u.id} className="flex items-baseline gap-2 text-xs">
                <span className="w-28 shrink-0 font-medium text-muted-foreground">{fmtDate(u.date)}{u.date === todayStr() ? " · today" : ""}</span>
                <Check className="size-3 shrink-0 translate-y-0.5 text-primary" />
                <span className="min-w-0 flex-1">{u.comment ? u.comment : <em className="text-muted-foreground">no comment</em>}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// Local-state comment box that commits on blur or Enter (so typing isn't
// interrupted by store re-renders).
function CommentBox({ value, onSave }) {
  const commit = (el) => { if (el.value !== value) onSave(el.value); };
  return (
    <Input
      defaultValue={value}
      key={value}
      placeholder="Optional comment on today's update…"
      className="h-8 flex-1 text-sm"
      onBlur={(e) => commit(e.target)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
    />
  );
}
