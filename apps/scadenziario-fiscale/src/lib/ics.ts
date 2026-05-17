import type { Scadenza } from "./types.js";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIcsDate(iso: string): string {
  // 2026-05-16 → 20260516
  return iso.replace(/-/g, "");
}

function escapeIcs(s: string): string {
  return s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function buildIcs(scadenze: Scadenza[], calendarName: string): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const events = scadenze.map((s) => {
    const d = toIcsDate(s.date);
    return [
      "BEGIN:VEVENT",
      `UID:${s.id}@scadenziario.drilonhametaj.it`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${d}`,
      `SUMMARY:${escapeIcs(s.title)}`,
      `DESCRIPTION:${escapeIcs(s.description + (s.reference ? `\n${s.reference}` : ""))}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-P7D",
      `DESCRIPTION:Promemoria 7 giorni: ${escapeIcs(s.title)}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Drilon Hametaj//Scadenziario Fiscale//IT",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
