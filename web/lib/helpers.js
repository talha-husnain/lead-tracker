import { PRIORITIES } from "./constants";

export function uid() {
  return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function nowISO() {
  return new Date().toISOString();
}
export function todayStr(d = new Date()) {
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}
export function addDaysStr(base, n) {
  const d = base ? new Date(base + "T00:00:00") : new Date();
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
export function monthKey(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
export function relDays(dateStr) {
  if (!dateStr) return null;
  const a = new Date(dateStr + "T00:00:00");
  const b = new Date(todayStr() + "T00:00:00");
  return Math.round((a - b) / 86400000);
}
export function fmtMoney(n) {
  const v = Number(n) || 0;
  if (!v) return "—";
  return "$" + v.toLocaleString("en-US");
}
export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function initials(name) {
  const p = (name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}
export function colorFor(name) {
  const palette = ["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e87ba4", "#eb6834", "#008300", "#e34948"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
export function statusById(statuses, id) {
  return statuses.find((s) => s.id === id) || statuses[0];
}
export function prioById(id) {
  return PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];
}
export function isOpenLead(statuses, l) {
  return !statusById(statuses, l.status).terminal;
}
export function firstTerminal(statuses, kind) {
  const s = statuses.find((x) => x.terminal === kind);
  return s ? s.id : statuses[0].id;
}
export function fillTemplate(text, l, settings) {
  const first = (l.name || "").trim().split(/\s+/)[0] || "there";
  return String(text)
    .replace(/{firstName}/g, first).replace(/{name}/g, l.name || "there")
    .replace(/{company}/g, l.company || "your team").replace(/{title}/g, l.title || "")
    .replace(/{me}/g, settings.senderName || "").replace(/{myCompany}/g, settings.senderCompany || "");
}
export function hexA(hex, a) {
  const h = (hex || "#888").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ---- Google Calendar "Add to Calendar" link for a lead's follow-up ----
export function gcalUrl(lead) {
  if (!lead?.nextFollowUp) return "";
  const date = lead.nextFollowUp.replace(/-/g, "");
  const text = encodeURIComponent(`Follow up: ${lead.name || "lead"}${lead.company ? " (" + lead.company + ")" : ""}`);
  const details = encodeURIComponent(`Lead follow-up.${lead.email ? " " + lead.email : ""}${lead.phone ? " · " + lead.phone : ""}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${date}T090000/${date}T093000&details=${details}`;
}

// ---- Auto-enrich company + website from an email's domain ----
const FREE_EMAIL = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com",
  "proton.me", "protonmail.com", "live.com", "msn.com", "gmx.com", "me.com", "yandex.com",
]);
export function enrichFromEmail(email) {
  const m = /@([^@\s]+)$/.exec((email || "").trim());
  if (!m) return null;
  const domain = m[1].toLowerCase();
  if (FREE_EMAIL.has(domain)) return null;
  const root = domain.split(".")[0];
  const company = root.charAt(0).toUpperCase() + root.slice(1);
  return { company, url: "https://" + domain };
}

// ---- CSV ----
export function toCSV(leads, statuses) {
  const cols = ["Name", "Email", "Phone", "Company", "Project", "Title", "Source", "Status", "Priority", "Value", "Tags", "Next Follow-up", "Notes"];
  const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const rows = leads.map((l) =>
    [l.name, l.email, l.phone, l.company, l.project, l.title, l.source, statusById(statuses, l.status).label,
      prioById(l.priority).label, l.value || "", (l.tags || []).join("; "), l.nextFollowUp || "",
      (l.notes || []).map((n) => n.text).join(" • ")].map(q).join(",")
  );
  return [cols.map(q).join(","), ...rows].join("\r\n");
}
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inq = false; }
      else cur += c;
    } else if (c === '"') inq = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => (c || "").trim() !== ""));
}
