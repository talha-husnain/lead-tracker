"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUi } from "./ui-context";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TEMPLATES } from "@/lib/constants";
import { uid } from "@/lib/helpers";
import { Trash2 } from "lucide-react";

export function SettingsDialog() {
  const { db, actions } = useStore();
  const ui = useUi();
  const toast = useToast();
  const s = db.settings;
  const [senderName, setSenderName] = useState(s.senderName || "");
  const [senderCompany, setSenderCompany] = useState(s.senderCompany || "");
  const [goal, setGoal] = useState(s.goal || "");
  const [notify, setNotify] = useState(!!s.notify);
  const [tpls, setTpls] = useState(() => s.templates.map((t) => ({ ...t })));

  const setTpl = (i, k, v) => setTpls((arr) => arr.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const addTpl = () => setTpls((arr) => [...arr, { id: "t" + uid(), name: "New template", subject: "Hi {firstName}", body: "Hi {firstName},\n\n\n\nBest,\n{me}" }]);
  const delTpl = (i) => setTpls((arr) => arr.filter((_, j) => j !== i));

  const toggleNotify = async () => {
    if (!("Notification" in window)) { toast("This browser does not support notifications."); return; }
    if (notify) { setNotify(false); return; }
    const p = await Notification.requestPermission();
    if (p === "granted") setNotify(true);
    else toast("Permission blocked — allow notifications in your browser.");
  };

  const save = () => {
    actions.update((d) => {
      d.settings.senderName = senderName.trim();
      d.settings.senderCompany = senderCompany.trim();
      d.settings.goal = Number(goal) || 0;
      d.settings.notify = notify;
      const cleaned = tpls.filter((t) => t.name.trim());
      d.settings.templates = cleaned.length ? cleaned : DEFAULT_TEMPLATES.map((t) => ({ ...t }));
    });
    toast("Settings saved.");
    ui.closeSettings();
  };

  return (
    <Dialog open onClose={ui.closeSettings} size="lg">
      <DialogTitle>Settings</DialogTitle>
      <DialogDescription>Personalize your tracker, goal, and follow-up email templates.</DialogDescription>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Your name (email sign-off)</Label><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Alex" /></div>
          <div className="space-y-1.5"><Label>Your company</Label><Input value={senderCompany} onChange={(e) => setSenderCompany(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Monthly revenue goal ($)</Label><Input type="number" min="0" step="any" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 50000" /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Follow-up reminders</Label>
          <Button type="button" variant="outline" size="sm" onClick={toggleNotify}>
            {notify ? "🔔 On — click to turn off" : "🔕 Off — click to enable browser reminders"}
          </Button>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email templates</div>
          <div className="space-y-3">
            {tpls.map((t, i) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Input value={t.name} onChange={(e) => setTpl(i, "name", e.target.value)} placeholder="Template name" />
                  <Button variant="ghost" size="iconSm" onClick={() => delTpl(i)}><Trash2 className="size-3.5" /></Button>
                </div>
                <Input className="mb-2" value={t.subject} onChange={(e) => setTpl(i, "subject", e.target.value)} placeholder="Subject" />
                <Textarea value={t.body} onChange={(e) => setTpl(i, "body", e.target.value)} className="min-h-[90px]" />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={addTpl}>+ Add template</Button>
          <p className="mt-2 text-xs text-muted-foreground">Variables: {"{firstName} {name} {company} {title} {me} {myCompany}"}</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={ui.closeSettings}>Cancel</Button>
        <Button onClick={save}>Save settings</Button>
      </DialogFooter>
    </Dialog>
  );
}
