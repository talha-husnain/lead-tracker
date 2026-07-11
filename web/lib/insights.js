import { statusById, isOpenLead } from "./helpers";

const DAY = 86400000;
function days(a, b) { return Math.round((new Date(b) - new Date(a)) / DAY); }

export function activityStreak(leads) {
  const set = new Set();
  leads.forEach((l) => (l.notes || []).forEach((n) => {
    const d = new Date(n.at);
    if (!isNaN(d)) set.add(d.toISOString().slice(0, 10));
  }));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  return streak;
}

export function addedThisWeek(leads) {
  const cut = Date.now() - 7 * DAY;
  return leads.filter((l) => new Date(l.createdAt).getTime() >= cut).length;
}

export function avgDaysToClose(leads, statuses) {
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won" && l.closedAt);
  if (!won.length) return null;
  return Math.round(won.reduce((s, l) => s + Math.max(0, days(l.createdAt, l.closedAt)), 0) / won.length);
}

export function avgOpenAge(leads, statuses) {
  const open = leads.filter((l) => isOpenLead(statuses, l));
  if (!open.length) return null;
  const now = Date.now();
  return Math.round(open.reduce((s, l) => s + Math.max(0, (now - new Date(l.createdAt)) / DAY), 0) / open.length);
}

export function forecast(leads, statuses) {
  const open = leads.filter((l) => isOpenLead(statuses, l));
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won");
  const lost = leads.filter((l) => statusById(statuses, l.status).terminal === "lost");
  const closed = won.length + lost.length;
  const winRate = closed ? won.length / closed : 0;
  const openVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
  return Math.round(openVal * winRate);
}

export function salesVelocity(leads, statuses) {
  const open = leads.filter((l) => isOpenLead(statuses, l));
  const won = leads.filter((l) => statusById(statuses, l.status).terminal === "won");
  const lost = leads.filter((l) => statusById(statuses, l.status).terminal === "lost");
  const closed = won.length + lost.length;
  const winRate = closed ? won.length / closed : 0;
  const avgVal = won.length
    ? won.reduce((s, l) => s + (Number(l.value) || 0), 0) / won.length
    : open.reduce((s, l) => s + (Number(l.value) || 0), 0) / (open.length || 1);
  const cycle = avgDaysToClose(leads, statuses) || 30;
  if (!cycle) return 0;
  return Math.round((open.length * avgVal * winRate) / cycle);
}

export function staleLeads(leads, statuses, d = 14) {
  const cut = Date.now() - d * DAY;
  return leads.filter((l) => isOpenLead(statuses, l) && new Date(l.updatedAt).getTime() < cut);
}

export function hottestLead(leads, statuses) {
  const open = leads.filter((l) => isOpenLead(statuses, l));
  const score = (l) => (l.priority === "hot" ? 100 : l.priority === "warm" ? 50 : 0) + (Number(l.value) || 0) / 1000;
  return open.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

export function createdPerDay(leads, n = 12) {
  const arr = new Array(n).fill(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  leads.forEach((l) => {
    const d = new Date(l.createdAt); d.setHours(0, 0, 0, 0);
    const diff = Math.round((today - d) / DAY);
    if (diff >= 0 && diff < n) arr[n - 1 - diff]++;
  });
  return arr;
}
