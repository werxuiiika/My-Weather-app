// Offline-looking errors (DNS/VPN/no route) shared by all screens so they
// can show a friendly message (and stay silent in logs) instead of leaking
// raw fetch errors into the UI.
export const OFFLINE_RE = /unknownhost|resolve host|no address|network request failed|fetch failed|timed out|timeout|abort|econn|enotfound|no internet/i;
export function isOfflineError(e) {
  if (!e) return false;
  if (e.kind === 'network') return true;
  return OFFLINE_RE.test(String(e.message || e));
}

// Shared Open-Meteo geocoding search with fallbacks.
//
// Why this exists: Open-Meteo's `language` parameter only changes the
// *response* language, not matching. A Cyrillic query like "Фицджералд"
// returns zero results for every language value, even though
// "Fitzgerald" exists in the DB. So after the plain language fallbacks
// we transliterate the query to Latin and try ambiguity variants
// (ц -> tz/ts/c, дж -> j/g/zh, ...) until something matches.

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const RU_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function transliterate(text) {
  return String(text || '')
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = RU_MAP[lower];
      if (mapped === undefined) return ch;
      // Preserve capitalization of the first letter of a word-ish chunk.
      if (ch !== lower && mapped.length > 0) {
        return mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return mapped;
    })
    .join('');
}

// Ambiguous transliterations: one Cyrillic letter can map to several
// Latin spellings in real-world names (Фицджералд -> Fitzgerald:
// ц->tz, дж->g). Each group lists alternatives for a Latin chunk.
const ALT_GROUPS = [
  ['ts', 'tz', 'c'],
  ['dzh', 'j', 'g', 'zh'],
  ['kh', 'h'],
  ['zh', 'j', 'z'],
  ['shch', 'sch', 'sh'],
  ['sh', 'sch'],
  ['ch', 'tch'],
  ['ya', 'ja'],
  ['yu', 'ju'],
  ['yo', 'jo', 'o'],
  ['ye', 'e'],
  ['ks', 'x'],
  ['v', 'w'],
  ['i', 'y'],
];

const MAX_CANDIDATES = 12;

// "English-leaning" transliteration: how Russian names usually appear in
// international DBs (Фицджералд -> Fitzgerald, Харьков -> Kharkov/Harkov).
// Applied as one extra candidate before the combinatorial expansion.
const EN_LEANING = [
  ['dzh', 'g'],
  ['shch', 'sh'],
  ['ts', 'tz'],
  ['kh', 'h'],
  ['zh', 'j'],
  ['ya', 'ja'],
  ['yu', 'ju'],
  ['ks', 'x'],
];

function englishLeaning(str) {
  let s = str;
  for (const [from, to] of EN_LEANING) {
    const re = new RegExp(from, 'gi');
    s = s.replace(re, (m) =>
      m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase()
        ? to.charAt(0).toUpperCase() + to.slice(1)
        : to
    );
  }
  return s;
}

function substituteFirst(str, from, to) {
  const idx = str.toLowerCase().indexOf(from);
  if (idx === -1) return null;
  return str.slice(0, idx) + to + str.slice(idx + from.length);
}

export function buildSearchCandidates(query) {
  const base = transliterate(query.trim());
  const candidates = [];
  const seen = new Set();
  const push = (s) => {
    const key = s.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (candidates.length < MAX_CANDIDATES) candidates.push(s);
  };
  push(base);
  push(englishLeaning(base));
  // Single substitutions (skip reverse-expanding ones like zh -> dzh).
  const oneSubs = [];
  for (const group of ALT_GROUPS) {
    const present = group.filter((alt) =>
      base.toLowerCase().includes(alt)
    );
    if (present.length === 0) continue;
    for (const from of present) {
      for (const to of group) {
        if (to === from) continue;
        if (from.length > 1 && to.includes(from)) continue;
        const v = substituteFirst(base, from, to);
        if (v) {
          push(v);
          oneSubs.push(v);
        }
      }
    }
  }
  // Pairwise combinations (e.g. ts->tz AND dzh->g gives Fitzgerald).
  for (const v of oneSubs) {
    if (candidates.length >= MAX_CANDIDATES) break;
    for (const group of ALT_GROUPS) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const present = group.filter((alt) =>
        v.toLowerCase().includes(alt)
      );
      for (const from of present) {
        for (const to of group) {
          if (to === from) continue;
          const v2 = substituteFirst(v, from, to);
          if (v2) push(v2);
          if (candidates.length >= MAX_CANDIDATES) break;
        }
        if (candidates.length >= MAX_CANDIDATES) break;
      }
    }
  }
  return candidates;
}

async function searchOnce(query, lang, fetchFn) {
  const data = await fetchFn(
    `${GEO_URL}?name=${encodeURIComponent(query)}&count=5&language=${lang}&format=json`
  );
  if (data && data.results && data.results.length > 0) {
    return data.results[0];
  }
  return null;
}

// Strict algorithm:
//  1. Query with the current app language.
//  2. If empty -> same query with language=en.
//  3. If still empty and the query contains Cyrillic -> transliterated
//     Latin variants with language=en, first hit wins.
// Returns the first result object or null (caller shows "not found").
export async function geocodeCity(query, lang, fetchFn) {
  const q = String(query || '').trim();
  if (!q) return null;
  const currentLang = lang || 'ru';

  const first = await searchOnce(q, currentLang, fetchFn);
  if (first) return first;

  if (currentLang !== 'en') {
    const second = await searchOnce(q, 'en', fetchFn);
    if (second) return second;
  }

  if (/[а-яё]/i.test(q)) {
    const candidates = buildSearchCandidates(q);
    for (const c of candidates) {
      const hit = await searchOnce(c, 'en', fetchFn);
      if (hit) return hit;
    }
  }
  return null;
}
