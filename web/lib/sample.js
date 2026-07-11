import { newLead } from "./constants";
import { addDaysStr, todayStr, nowISO, uid } from "./helpers";

export function sampleLeads() {
  const day = (n) => addDaysStr(todayStr(), n);
  const S = (name, extra) => newLead({ name, ...extra });
  return [
    S("Sarah Mitchell", { company: "Aurora Skincare", title: "Founder", email: "sarah@auroraskin.co", source: "LinkedIn", status: "meeting", priority: "hot", value: 12000, project: "Social + paid ads", nextFollowUp: day(-1), tags: ["beauty", "retainer"], notes: [{ id: uid(), text: "Great discovery call. Send proposal by Friday.", at: nowISO() }] }),
    S("David Chen", { company: "Peak Fitness", title: "CMO", email: "david@peakfit.com", source: "Referral", status: "proposal", priority: "hot", value: 24000, nextFollowUp: day(0), notes: [{ id: uid(), text: "Proposal sent. Follow up on pricing today.", at: nowISO() }] }),
    S("Maria Gonzalez", { company: "Casa Bella Interiors", title: "Owner", email: "maria@casabella.design", source: "Instagram", status: "contacted", priority: "warm", value: 8000, nextFollowUp: day(2) }),
    S("Priya Nair", { company: "Lumen Ventures", title: "Partner", email: "priya@lumen.vc", source: "Event / Conference", status: "negotiation", priority: "hot", value: 36000, nextFollowUp: day(1), tags: ["enterprise"] }),
    S("James Wright", { company: "Wright Auto Group", title: "Marketing Lead", source: "Website", status: "won", priority: "warm", value: 18000, notes: [{ id: uid(), text: "Signed! Kickoff next week.", at: nowISO() }] }),
    S("Tom Baker", { company: "Baker & Co Law", title: "Partner", email: "tom@bakerlaw.com", source: "Cold Email", status: "new", priority: "cold", value: 6000, nextFollowUp: day(5) }),
  ];
}
