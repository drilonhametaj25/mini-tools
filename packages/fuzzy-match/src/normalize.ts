// Forme societarie italiane più comuni (rimosse per match nominale)
const SUFFIX_RE = /\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?|s\.?c\.?|s\.?c\.?a\.?r\.?l\.?|s\.?c\.?p\.?a\.?|s\.?c\.?r\.?l\.?|coop(?:erativa)?|ditta individuale|d\.?i\.?)\b/gi;

// Stop words / connettivi nel nome
const STOP_WORDS_RE = /\b(di|de|della|del|dei|degli|delle|da|e|the|of|and|llc|inc|gmbh|ltd|ag|bv)\b/gi;

// Espansioni indirizzo
const ADDRESS_EXPANSIONS: Record<string, string> = {
  "v.": "via",
  "v.le": "viale",
  "v.lo": "vicolo",
  "p.za": "piazza",
  "p.le": "piazzale",
  "c.so": "corso",
  "str.": "strada",
  "loc.": "localita",
  "fraz.": "frazione",
  "cas.": "casale",
};

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeName(input: string): string {
  if (!input) return "";
  let s = stripAccents(input).toLowerCase();
  s = s.replace(SUFFIX_RE, " ");
  s = s.replace(STOP_WORDS_RE, " ");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function normalizeAddress(input: string): string {
  if (!input) return "";
  let s = stripAccents(input).toLowerCase();
  for (const [abbr, full] of Object.entries(ADDRESS_EXPANSIONS)) {
    const re = new RegExp(`(^|\\s)${abbr.replace(/\./g, "\\.")}(\\s|$)`, "g");
    s = s.replace(re, `$1${full}$2`);
  }
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizePhoneIt(input: string): string {
  if (!input) return "";
  let s = input.replace(/\D/g, "");
  if (s.startsWith("0039")) s = s.slice(4);
  if (s.startsWith("39") && s.length >= 11 && s.length <= 13) s = s.slice(2);
  return s;
}
