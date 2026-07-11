"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITIES, SOURCES, newLead } from "@/lib/constants";
import { nowISO, uid, enrichFromEmail } from "@/lib/helpers";
import { ChevronRight } from "lucide-react";

function Field({ label, children, className }) {
  return (
    <div className={"space-y-1.5 " + (className || "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

export function LeadDialog({ lead }) {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const editing = !!lead;
  const [more, setMore] = useState(
    () => !!(lead && (lead.project || lead.sourceUrl || lead.cadence || (lead.tags || []).length || (lead.links || []).length))
  );

  const [f, setF] = useState(() => ({
    name: lead?.name || "", email: lead?.email || "", phone: lead?.phone || "", company: lead?.company || "",
    title: lead?.title || "", project: lead?.project || "", source: lead?.source || "LinkedIn", sourceUrl: lead?.sourceUrl || "",
    status: lead?.status || db.statuses[0].id, priority: lead?.priority || "warm", value: lead?.value || "",
    nextFollowUp: lead?.nextFollowUp || "", cadence: lead?.cadence ?? 0, tags: (lead?.tags || []).join(", "),
    links: (lead?.links || []).map((x) => `${x.label || ""} | ${x.url || ""}`).join("\n"), firstNote: "",
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const enrichEmail = () => {
    const info = enrichFromEmail(f.email);
    if (info) setF((s) => ({ ...s, company: s.company || info.company, sourceUrl: s.sourceUrl || info.url }));
  };

  const save = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = {
      name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), company: f.company.trim(),
      title: f.title.trim(), project: f.project.trim(), source: f.source, sourceUrl: f.sourceUrl.trim(),
      status: f.status, priority: f.priority, value: Number(f.value) || 0, nextFollowUp: f.nextFollowUp, cadence: Number(f.cadence) || 0,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      links: f.links.split("\n").map((s) => s.trim()).filter(Boolean).map((line) => {
        const i = line.indexOf("|");
        return i >= 0 ? { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() } : { label: line, url: line };
      }),
    };
    if (!editing && data.email) {
      const dup = db.leads.find((x) => x.email && x.email.toLowerCase() === data.email.toLowerCase());
      if (dup && !confirm(`A lead with ${data.email} already exists (“${dup.name}”). Add anyway?`)) return;
    }
    actions.update((d) => {
      if (editing) {
        const l = d.leads.find((x) => x.id === lead.id);
        if (l) Object.assign(l, data, { updatedAt: nowISO() });
      } else {
        const nl = newLead(data);
        if (f.firstNote.trim()) nl.notes.unshift({ id: uid(), text: f.firstNote.trim(), at: nowISO() });
        d.leads.unshift(nl);
      }
    });
    toast(editing ? "Lead updated." : "Lead added.");
    ui.closeForm();
  };

  return (
    <Dialog open onClose={ui.closeForm} size="lg" className="flex max-h-[88vh] flex-col p-0">
      <div className="border-b border-border px-6 pb-4 pt-6">
        <DialogTitle>{editing ? "Edit lead" : "Add a new lead"}</DialogTitle>
        <DialogDescription>{editing ? "Update the details below." : "Just the name is required — add the rest anytime."}</DialogDescription>
      </div>

      <form id="lead-form" onSubmit={save} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <Section title="Contact">
          <Field label="Name *"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" autoFocus /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} onBlur={enrichEmail} placeholder="jane@company.com" /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 …" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company"><Input value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Company / brand" /></Field>
            <Field label="Title / role"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Marketing Director" /></Field>
          </div>
        </Section>

        <Section title="Pipeline">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}>{db.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
            <Field label="Priority"><Select value={f.priority} onChange={(e) => set("priority", e.target.value)}>{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Next follow-up"><Input type="date" value={f.nextFollowUp} onChange={(e) => set("nextFollowUp", e.target.value)} /></Field>
            <Field label="Deal value ($)"><Input type="number" min="0" step="any" value={f.value} onChange={(e) => set("value", e.target.value)} placeholder="0" /></Field>
          </div>
        </Section>

        <div className="space-y-3">
          <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight className={"size-4 transition-transform " + (more ? "rotate-90" : "")} /> More details
          </button>
          {more && (
            <div className="space-y-3 border-l-2 border-border pl-4">
              <Field label="Project"><Input value={f.project} onChange={(e) => set("project", e.target.value)} placeholder="e.g. Website redesign, Q3 campaign" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Source"><Select value={f.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
                <Field label="Profile / link"><Input value={f.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
              </div>
              <Field label="Auto follow-up cadence (days · 0 = off)"><Input type="number" min="0" step="1" value={f.cadence} onChange={(e) => set("cadence", e.target.value)} placeholder="0" /></Field>
              <Field label="Tags (comma separated)"><Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="enterprise, referral, hot" /></Field>
              <Field label="Links (one per line — Label | https://…)"><Textarea value={f.links} onChange={(e) => set("links", e.target.value)} placeholder={"Proposal | https://…\nContract | https://…"} /></Field>
              {!editing && <Field label="First note (optional)"><Textarea value={f.firstNote} onChange={(e) => set("firstNote", e.target.value)} placeholder="Where did you meet? What did you discuss?" /></Field>}
            </div>
          )}
        </div>
      </form>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={ui.closeForm}>Cancel</Button>
        <Button type="submit" form="lead-form">{editing ? "Save changes" : "Add lead"}</Button>
      </div>
    </Dialog>
  );
}
