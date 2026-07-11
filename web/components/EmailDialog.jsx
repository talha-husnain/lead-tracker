"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fillTemplate, addDaysStr, todayStr, nowISO, uid } from "@/lib/helpers";

export function EmailDialog({ id }) {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const lead = db.leads.find((l) => l.id === id);
  const tpls = db.settings.templates;
  const first = tpls[0] || { subject: "", body: "" };
  const [ti, setTi] = useState(0);
  const [subject, setSubject] = useState(lead ? fillTemplate(first.subject, lead, db.settings) : "");
  const [body, setBody] = useState(lead ? fillTemplate(first.body, lead, db.settings) : "");
  if (!lead) return null;

  const pick = (i) => {
    setTi(i);
    const t = tpls[i]; if (!t) return;
    setSubject(fillTemplate(t.subject, lead, db.settings));
    setBody(fillTemplate(t.body, lead, db.settings));
  };
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(body).then(() => toast("Copied to clipboard."), () => toast("Select the text and copy manually."));
    else toast("Select the text and copy manually.");
  };
  const openInEmail = () => {
    window.location.href = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const logSnooze = () => {
    actions.update((d) => {
      const l = d.leads.find((x) => x.id === id);
      if (!l) return;
      l.notes.unshift({ id: uid(), text: "Sent follow-up: " + subject, at: nowISO() });
      l.nextFollowUp = addDaysStr(todayStr(), 7);
      l.updatedAt = nowISO();
    });
    toast("Logged — next follow-up in 1 week.");
    ui.closeEmail();
  };

  return (
    <Dialog open onClose={ui.closeEmail} size="lg">
      <DialogTitle>Follow-up email</DialogTitle>
      <DialogDescription>To {lead.name || "lead"}{lead.email ? ` · ${lead.email}` : " · no email on file"}</DialogDescription>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Template</Label>
          <Select value={ti} onChange={(e) => pick(Number(e.target.value))}>
            {tpls.map((t, i) => <option key={t.id} value={i}>{t.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px]" /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={ui.closeEmail}>Close</Button>
        <Button variant="outline" onClick={copy}>Copy</Button>
        {lead.email && <Button variant="outline" onClick={openInEmail}>Open in email app</Button>}
        <Button onClick={logSnooze}>Log &amp; snooze 1 week</Button>
      </DialogFooter>
    </Dialog>
  );
}
