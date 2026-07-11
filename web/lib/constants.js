// Domain constants for Lead Tracker (ported from the original app)

export const DEFAULT_STATUSES = [
  { id: "new", label: "New Lead", color: "#2a78d6" },
  { id: "contacted", label: "Contacted", color: "#4a3aa7" },
  { id: "meeting", label: "Meeting Scheduled", color: "#1baf7a" },
  { id: "met", label: "Meeting Done", color: "#eb6834" },
  { id: "proposal", label: "Proposal Sent", color: "#eda100" },
  { id: "negotiation", label: "Negotiation", color: "#e87ba4" },
  { id: "won", label: "Won", color: "#0ca30c", terminal: "won" },
  { id: "lost", label: "Lost", color: "#d03b3b", terminal: "lost" },
  { id: "hold", label: "On Hold", color: "#898781" },
];

export const PRIORITIES = [
  { id: "hot", label: "Hot", color: "#d03b3b" },
  { id: "warm", label: "Warm", color: "#eda100" },
  { id: "cold", label: "Cold", color: "#2a78d6" },
];

export const SOURCES = [
  "LinkedIn", "Referral", "Website", "Cold Email", "Cold Call",
  "Instagram", "Facebook", "Upwork", "Event / Conference", "Inbound", "Other",
];

export const DEFAULT_TEMPLATES = [
  {
    id: "after-meeting", name: "After a meeting", subject: "Great connecting, {firstName}",
    body: "Hi {firstName},\n\nThank you for taking the time to meet today — I really enjoyed learning more about {company} and what you're working toward.\n\nAs discussed, here are the next steps:\n•\n•\n\nI'll follow up with more detail shortly. In the meantime, let me know if any questions come up.\n\nBest,\n{me}\n{myCompany}",
  },
  {
    id: "proposal", name: "Proposal follow-up", subject: "Proposal for {company}",
    body: "Hi {firstName},\n\nFollowing up on the proposal I sent over for {company}. I'd love to hear your thoughts and answer any questions.\n\nAre you free for a quick call this week?\n\nBest,\n{me}\n{myCompany}",
  },
  {
    id: "checkin", name: "Gentle check-in", subject: "Checking in, {firstName}",
    body: "Hi {firstName},\n\nJust circling back on my last note — I know things get busy! Is now a good time to pick this back up?\n\nHappy to work around your schedule.\n\nBest,\n{me}\n{myCompany}",
  },
];

export function freshDB() {
  return {
    version: 2,
    leads: [],
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    settings: {
      theme: null, goal: 0, senderName: "", senderCompany: "BrandLux Media",
      templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
    },
  };
}

export function normalizeDB(data) {
  data = data || {};
  if (!Array.isArray(data.leads)) data.leads = [];
  if (!Array.isArray(data.statuses) || !data.statuses.length)
    data.statuses = DEFAULT_STATUSES.map((s) => ({ ...s }));
  data.settings = Object.assign(
    { theme: null, goal: 0, senderName: "", senderCompany: "BrandLux Media", templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })) },
    data.settings || {}
  );
  if (!Array.isArray(data.settings.templates) || !data.settings.templates.length)
    data.settings.templates = DEFAULT_TEMPLATES.map((t) => ({ ...t }));
  data.leads.forEach((l) => {
    if (!Array.isArray(l.links)) l.links = [];
    if (!Array.isArray(l.notes)) l.notes = [];
    if (!Array.isArray(l.tags)) l.tags = [];
  });
  return data;
}

export function newLead(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: "", email: "", phone: "", company: "", title: "", project: "",
    source: "LinkedIn", sourceUrl: "", status: "new", priority: "warm",
    value: 0, tags: [], nextFollowUp: "", cadence: 0, notes: [], links: [],
    createdAt: now, updatedAt: now, ...partial,
  };
}
