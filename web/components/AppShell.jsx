"use client";
import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { UiContext } from "./ui-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownItem, DropdownSep } from "@/components/ui/dropdown";
import { Today } from "./views/Today";
import { Dashboard } from "./views/Dashboard";
import { LeadsView } from "./views/LeadsView";
import { Board } from "./views/Board";
import { Reports } from "./views/Reports";
import { LeadDialog } from "./LeadDialog";
import { LeadDrawer } from "./LeadDrawer";
import { EmailDialog } from "./EmailDialog";
import { TerminalDialog } from "./TerminalDialog";
import { SettingsDialog } from "./SettingsDialog";
import { StatusEditorDialog } from "./StatusEditorDialog";
import { CommandPalette } from "./CommandPalette";
import { HelpDialog } from "./HelpDialog";
import { useToast } from "@/components/ui/toast";
import { usePwa } from "./PwaProvider";
import { toCSV, parseCSV, isOpenLead, relDays, statusById, nowISO, uid } from "@/lib/helpers";
import { freshDB, normalizeDB, newLead } from "@/lib/constants";
import { sampleLeads } from "@/lib/sample";
import { Target, Plus, Moon, Sun, LogOut, Search, Cloud, ChevronDown, AlarmClock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  ["today", "Today"],
  ["dashboard", "Dashboard"],
  ["leads", "Leads"],
  ["board", "Board"],
  ["reports", "Reports"],
];

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AppShell() {
  const { db, mode, user, theme, actions } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("today");
  const [detailId, setDetailId] = useState(null);
  const [formLead, setFormLead] = useState(undefined);
  const [emailId, setEmailId] = useState(null);
  const [terminal, setTerminal] = useState(null); // { id, kind }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const { canInstall, promptInstall } = usePwa();
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName || "") || el?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPaletteOpen(true); return; }
      if (typing) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); setFormLead(null); }
      else if (e.key === "?") setHelpOpen(true);
      else if (e.key === "1") setTab("today");
      else if (e.key === "2") setTab("dashboard");
      else if (e.key === "3") setTab("leads");
      else if (e.key === "4") setTab("board");
      else if (e.key === "5") setTab("reports");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Browser reminders for due follow-ups (opt-in), on load + hourly while open.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const fire = () => {
      const cur = dbRef.current;
      if (!cur?.settings?.notify || Notification.permission !== "granted") return;
      const due = cur.leads.filter((l) => isOpenLead(cur.statuses, l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0);
      if (due.length) {
        try { new Notification("Lead Tracker — follow-ups due", { body: `${due.length} follow-up${due.length > 1 ? "s" : ""} need attention today.`, icon: "/icons/icon-192.png" }); } catch (e) { /* ignore */ }
      }
    };
    const t = setTimeout(fire, 4000);
    const iv = setInterval(fire, 60 * 60 * 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  if (!db) return null;

  const ui = {
    tab, setTab, search, setSearch,
    openDetail: (id) => setDetailId(id),
    closeDetail: () => setDetailId(null),
    openForm: (lead = null) => setFormLead(lead),
    closeForm: () => setFormLead(undefined),
    openEmail: (id) => setEmailId(id),
    closeEmail: () => setEmailId(null),
    openTerminal: (id, kind) => setTerminal({ id, kind }),
    closeTerminal: () => setTerminal(null),
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    openStatus: () => setStatusOpen(true),
    closeStatus: () => setStatusOpen(false),
    openPalette: () => setPaletteOpen(true),
    closePalette: () => setPaletteOpen(false),
    openHelp: () => setHelpOpen(true),
    closeHelp: () => setHelpOpen(false),
  };

  // ---- data menu actions ----
  const backup = () => {
    download(`lead-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2), "application/json");
    toast("Backup downloaded.");
  };
  const restore = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = normalizeDB(JSON.parse(reader.result));
          if (!confirm(`Restore ${data.leads.length} leads from this backup? This replaces your current data.`)) return;
          actions.update((d) => { d.leads = data.leads; d.statuses = data.statuses; const t = d.settings.theme; d.settings = data.settings; d.settings.theme = t; });
          toast("Backup restored.");
        } catch (e) { alert("Could not restore: " + e.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };
  const exportCSV = () => { download(`lead-tracker-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(db.leads, db.statuses), "text/csv"); toast("CSV exported."); };
  const importCSV = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rows = parseCSV(String(reader.result));
          if (rows.length < 2) throw new Error("No data rows found.");
          const head = rows[0].map((h) => h.trim().toLowerCase());
          const find = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
          const col = {
            name: find("name", "client", "client name", "full name", "contact"), email: find("email", "e-mail", "email address"),
            phone: find("phone", "phone number", "mobile"), company: find("company", "organization", "business", "brand"),
            title: find("title", "role", "position"), project: find("project", "project name"),
            source: find("source", "lead source", "channel"), status: find("status", "stage"), priority: find("priority"),
            value: find("value", "deal value", "amount", "budget"), tags: find("tags", "tag", "labels"),
            followup: find("next follow-up", "follow-up", "follow up", "followup"), notes: find("notes", "note", "comment", "comments"),
          };
          if (col.name < 0) throw new Error('Could not find a "Name" column.');
          const byLabel = {}; db.statuses.forEach((s) => (byLabel[s.label.toLowerCase()] = s.id));
          let added = 0;
          const fresh = [];
          rows.slice(1).forEach((r) => {
            const g = (i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : "");
            const nm = g(col.name); if (!nm) return;
            fresh.push(newLead({
              name: nm, email: g(col.email), phone: g(col.phone), company: g(col.company), title: g(col.title), project: g(col.project),
              source: g(col.source) || "Other", status: byLabel[g(col.status).toLowerCase()] || db.statuses[0].id,
              priority: ({ hot: "hot", warm: "warm", cold: "cold" })[g(col.priority).toLowerCase()] || "warm",
              value: Number(g(col.value).replace(/[^0-9.]/g, "")) || 0,
              tags: g(col.tags) ? g(col.tags).split(/[;,]/).map((x) => x.trim()).filter(Boolean) : [],
              nextFollowUp: g(col.followup) && !isNaN(new Date(g(col.followup))) ? new Date(g(col.followup)).toISOString().slice(0, 10) : "",
              notes: g(col.notes) ? [{ id: uid(), text: g(col.notes), at: nowISO() }] : [],
            }));
            added++;
          });
          actions.update((d) => { d.leads = [...fresh, ...d.leads]; });
          toast(`Imported ${added} lead${added !== 1 ? "s" : ""}.`);
        } catch (e) { alert("Import failed: " + e.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };
  const loadSample = () => actions.update((d) => { d.leads = [...sampleLeads(), ...d.leads]; });
  const clearAll = () => {
    if (!confirm("Delete ALL leads and reset the pipeline? Download a backup first if unsure.")) return;
    if (!confirm("Are you absolutely sure? Everything will be erased.")) return;
    actions.update((d) => { const fresh = freshDB(); const t = d.settings.theme; d.leads = fresh.leads; d.statuses = fresh.statuses; d.settings = fresh.settings; d.settings.theme = t; });
    setDetailId(null);
    toast("All data cleared.");
  };

  // ---- reminder banner ----
  const due = db.leads.filter((l) => isOpenLead(db.statuses, l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0);
  const overdue = due.filter((l) => relDays(l.nextFollowUp) < 0).length;

  return (
    <UiContext.Provider value={ui}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border/60 glass">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="pulse-ring grid size-9 place-items-center rounded-[18px] bg-primary text-primary-foreground"><Target className="size-[18px]" /></div>
              <div className="font-display text-xl font-bold tracking-tight">Lead Tracker<span className="text-primary">.</span></div>
            </div>

            <nav className="order-3 flex w-full gap-1 rounded-lg bg-secondary p-1 sm:order-none sm:w-auto">
              {TABS.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={cn("flex-1 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors sm:flex-none",
                    tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input ref={searchRef} value={search} onChange={(e) => { setSearch(e.target.value); if (tab === "dashboard") setTab("leads"); }} placeholder="Search leads…" className="h-9 w-44 pl-8" />
              </div>
              <Button onClick={() => setFormLead(null)}><Plus className="size-4" /> Add Lead</Button>
              <DropdownMenu trigger={<Button variant="outline">Data <ChevronDown className="size-4" /></Button>}>
                {canInstall && <DropdownItem onClick={promptInstall}>📱 Install app</DropdownItem>}
                {canInstall && <DropdownSep />}
                <DropdownItem onClick={backup}>⬇ Download backup (JSON)</DropdownItem>
                <DropdownItem onClick={restore}>⬆ Restore from backup</DropdownItem>
                <DropdownItem onClick={exportCSV}>↧ Export to CSV</DropdownItem>
                <DropdownItem onClick={importCSV}>⤒ Import from CSV</DropdownItem>
                <DropdownSep />
                <DropdownItem onClick={() => setSettingsOpen(true)}>⚙ Settings &amp; templates</DropdownItem>
                <DropdownItem onClick={() => setStatusOpen(true)}>🎨 Pipeline &amp; colors</DropdownItem>
                <DropdownItem onClick={() => setHelpOpen(true)}>⌨ Keyboard shortcuts</DropdownItem>
                <DropdownSep />
                <DropdownItem onClick={loadSample}>✨ Load sample data</DropdownItem>
                <DropdownItem danger onClick={clearAll}>🗑 Clear all data</DropdownItem>
              </DropdownMenu>
              <Button variant="ghost" size="icon" title="Toggle theme" onClick={() => actions.setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              {mode === "cloud" ? (
                <div className="flex items-center gap-1.5">
                  <div className="hidden max-w-[140px] truncate text-sm text-muted-foreground lg:block" title={user?.email}>{user?.email}</div>
                  <Button variant="ghost" size="icon" title="Sign out" onClick={() => actions.signOut()}><LogOut className="size-4" /></Button>
                </div>
              ) : (
                <span className="hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex" title="Cloud login not configured — data saved in this browser only.">
                  <Cloud className="size-3.5" /> Local
                </span>
              )}
            </div>
          </div>
        </header>

        {due.length > 0 && (
          <div className="border-b bg-primary/5">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
              <AlarmClock className="size-4 shrink-0 text-primary" />
              <span><strong>{due.length}</strong> follow-up{due.length > 1 ? "s" : ""} due{overdue ? ` (${overdue} overdue)` : ""} — don&apos;t let these slip.</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setSearch(""); setTab("leads"); }}>Review</Button>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-6">
          <div key={tab} className="animate-rise">
            {tab === "today" && <Today />}
            {tab === "dashboard" && <Dashboard />}
            {tab === "leads" && <LeadsView />}
            {tab === "board" && <Board />}
            {tab === "reports" && <Reports />}
          </div>
        </main>
      </div>

      <LeadDrawer id={detailId} />
      {formLead !== undefined && <LeadDialog lead={formLead} />}
      {emailId && <EmailDialog id={emailId} />}
      {terminal && <TerminalDialog payload={terminal} />}
      {settingsOpen && <SettingsDialog />}
      {statusOpen && <StatusEditorDialog />}
      {paletteOpen && <CommandPalette />}
      {helpOpen && <HelpDialog />}
    </UiContext.Provider>
  );
}
