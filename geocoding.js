// Offline-looking errors (DNS/VPN/no route) shared by all screens so they
// can show a friendly message (and stay silent in logs) instead of leaking
// raw fetch errors into the UI.
export const OFFLINE_RE = /unknownhost|resolve host|no address|network request failed|fetch failed|timed out|timeout|abort|econn|enotfound|no internet/i;
export function isOfflineError(e) {
  if (!e) return false;
  if (e.kind === 'network') return true;
  return OFFLINE_RE.test(String(e.message || e));
}

import * as Location from 'expo-location';

// Resolve a human-readable place name for coordinates. Returns
// { name, country } or null when nothing resolves (the caller applies
// its own fallback text: main screen uses "Current location", the city
// list uses a coordinate string).
//
// Chain (first hit wins):
//  1. Platform reverse-geocoder (expo-location, free, no key) — best
//     local coverage, e.g. Russian districts Open-Meteo never heard of.
//  2. Open-Meteo reverse — consistent with the search DB, but has gaps:
//     rural areas return HTTP 200 with {error:true, reason:"Not Found"}.
//  3. BigDataCloud reverse (free, no key).
// fetchFn is injected by the caller, same pattern as geocodeCity().
// Never-hang guards: the platform geocoder (Google Play Services on
// Android) can stall indefinitely when the network is broken instead of
// rejecting — without caps a dead network turns geolocation into an
// infinite hang rather than a fast fallback.
const REVERSE_STEP_MS = 8000;
const REVERSE_TOTAL_MS = 12000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('reverse timeout')), ms)),
  ]);
}

export async function resolvePlaceName(latitude, longitude, lang, fetchFn) {
  const chain = (async () => {
    try {
      const places = await withTimeout(
        Location.reverseGeocodeAsync({ latitude, longitude }),
        REVERSE_STEP_MS
      );
      const p = Array.isArray(places) && places.length > 0 ? places[0] : null;
      const name = p?.city || p?.district || p?.subregion || p?.region || p?.name;
      if (name) return { name, country: p?.country || '' };
    } catch (e) {}
    try {
      const data = await fetchFn(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=${lang || 'ru'}&format=json`
      );
      const p = data?.results?.length > 0 ? data.results[0] : null;
      const name = p?.name || p?.admin1;
      if (name) return { name, country: p?.country || '' };
    } catch (e) {}
    try {
      const data = await fetchFn(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${lang || 'ru'}`
      );
      const name = data?.city || data?.locality || data?.principalSubdivision;
      if (name) return { name, country: data?.countryName || '' };
    } catch (e) {}
    return null;
  })();
  // Total cap: whatever stalls inside, callers get null after 12s and
  // apply their own fallback (the orphaned chain only computes a value
  // nobody reads — it never touches state).
  try {
    return await withTimeout(chain, REVERSE_TOTAL_MS);
  } catch (e) {
    return null;
  }
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

async function searchAll(query, lang, fetchFn) {
  const data = await fetchFn(
    `${GEO_URL}?name=${encodeURIComponent(query)}&count=10&language=${lang}&format=json`
  );
  if (data && Array.isArray(data.results) && data.results.length > 0) {
    return data.results;
  }
  return [];
}

// Feature codes (GeoNames, used by Open-Meteo) that mean a real
// populated place: PPL = populated place, PPLA* = admin division seats,
// PPLC = capital, PPLG = seat of government.
const CITY_FEATURE_CODES = new Set([
  'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLC', 'PPLG',
]);

// True when a result is a country / administrative region rather than
// a city (PCL* = political entity, ADM* = administrative division).
export function isRegionLike(result) {
  const fc = String(result?.feature_code || '').toUpperCase();
  if (!fc) return false;
  return fc.startsWith('PCL') || fc.startsWith('ADM') || fc === 'AREA' || fc === 'RGN' || fc === 'CONT';
}

// Pick the best CITY from a results array — never blindly results[0],
// which may be a district, region or weather station. Prefers real
// populated places, breaking ties by population (most populous wins).
// Returns null when the array holds no usable city.
function pickBestCity(results) {
  const list = Array.isArray(results) ? results : [];
  if (list.length === 0) return null;
  const cities = list.filter((r) =>
    CITY_FEATURE_CODES.has(String(r?.feature_code || '').toUpperCase())
  );
  const pool = cities.length > 0 ? cities : list.filter((r) => !isRegionLike(r));
  if (pool.length === 0) return null;
  // No feature_code info at all -> keep legacy behavior (API order).
  if (!pool.some((r) => r && r.feature_code)) return pool[0];
  return [...pool].sort((a, b) => (b.population || 0) - (a.population || 0))[0];
}

// Strict algorithm:
//  1. Query with the current app language.
//  2. If empty -> same query with language=en.
//  3. If still empty and the query contains Cyrillic -> transliterated
//     Latin variants with language=en, first usable city wins.
// Returns the best city object, a country/region object (check with
// isRegionLike() — caller should ask for a specific city instead),
// or null (caller shows "not found").
export async function geocodeCity(query, lang, fetchFn) {
  const q = String(query || '').trim();
  if (!q) return null;
  const currentLang = lang || 'ru';

  const attempts = [[q, currentLang]];
  if (currentLang !== 'en') attempts.push([q, 'en']);
  if (/[а-яё]/i.test(q)) {
    for (const c of buildSearchCandidates(q)) attempts.push([c, 'en']);
  }

  let regionFallback = null;
  for (const [text, lg] of attempts) {
    const results = await searchAll(text, lg, fetchFn);
    if (results.length === 0) continue;
    const city = pickBestCity(results);
    if (city) return city;
    if (!regionFallback) {
      regionFallback = results.find((r) => isRegionLike(r)) || null;
    }
  }
  return regionFallback;
}
