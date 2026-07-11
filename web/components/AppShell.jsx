"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { UiContext } from "./ui-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dashboard } from "./views/Dashboard";
import { LeadsView } from "./views/LeadsView";
import { Board } from "./views/Board";
import { Reports } from "./views/Reports";
import { LeadDialog } from "./LeadDialog";
import { LeadDrawer } from "./LeadDrawer";
import { toCSV } from "@/lib/helpers";
import { Target, Plus, Moon, Sun, LogOut, Download, Search, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  ["dashboard", "Dashboard"],
  ["leads", "Leads"],
  ["board", "Board"],
  ["reports", "Reports"],
];

export function AppShell() {
  const { db, mode, user, theme, actions } = useStore();
  const [tab, setTab] = useState("dashboard");
  const [detailId, setDetailId] = useState(null);
  const [formLead, setFormLead] = useState(undefined); // undefined = closed, null = new, object = edit
  const [search, setSearch] = useState("");

  if (!db) return null;

  const ui = {
    tab, setTab,
    search, setSearch,
    openDetail: (id) => setDetailId(id),
    closeDetail: () => setDetailId(null),
    openForm: (lead = null) => setFormLead(lead),
    closeForm: () => setFormLead(undefined),
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(db.leads, db.statuses)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lead-tracker.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <UiContext.Provider value={ui}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Target className="size-4" />
              </div>
              <div className="font-semibold tracking-tight">Lead Tracker</div>
            </div>

            <nav className="order-3 flex w-full gap-1 rounded-lg bg-muted p-1 sm:order-none sm:w-auto">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                    tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => { setSearch(e.target.value); if (tab === "dashboard") setTab("leads"); }} placeholder="Search leads…" className="h-9 w-44 pl-8" />
              </div>
              <Button onClick={() => setFormLead(null)}><Plus className="size-4" /> Add Lead</Button>
              <Button variant="ghost" size="icon" title="Export CSV" onClick={exportCSV}><Download className="size-4" /></Button>
              <Button variant="ghost" size="icon" title="Toggle theme" onClick={() => actions.setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              {mode === "cloud" ? (
                <div className="flex items-center gap-1.5">
                  <div className="hidden max-w-[140px] truncate text-sm text-muted-foreground lg:block" title={user?.email}>{user?.email}</div>
                  <Button variant="ghost" size="icon" title="Sign out" onClick={() => actions.signOut()}><LogOut className="size-4" /></Button>
                </div>
              ) : (
                <span className="hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex" title="Cloud login not configured yet — data is saved in this browser only.">
                  <Cloud className="size-3.5" /> Local
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {tab === "dashboard" && <Dashboard />}
          {tab === "leads" && <LeadsView />}
          {tab === "board" && <Board />}
          {tab === "reports" && <Reports />}
        </main>
      </div>

      <LeadDrawer id={detailId} />
      {formLead !== undefined && <LeadDialog lead={formLead} />}
    </UiContext.Provider>
  );
}
