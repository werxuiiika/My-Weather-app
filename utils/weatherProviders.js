// Multi-provider weather layer: Open-Meteo primary, keyless fallbacks.
//
// Why: Open-Meteo's forecast host (api.open-meteo.com) is SNI/DPI-blocked
// on some RU providers and VPN exits while sibling hosts stay reachable
// (proven by the in-app diagnostics: search/geocoding green, forecast
// red). Instead of showing "no internet", the app silently switches:
//
//   forecast: Open-Meteo full -> 7Timer civil (normalized to the SAME
//             shape, so every screen works unchanged, just coarser)
//   search:   Open-Meteo geocoding (with transliteration) -> Nominatim
//   reverse:  (extended in geocoding.js) native -> OM -> BigDataCloud
//             -> Nominatim reverse
//
// Circuit breaker: once Open-Meteo fails, its flag stays down for
// OM_CIRCUIT_TTL_MS (no point burning a 10s timeout on every city of a
// 20-city poll — straight to fallback until the TTL expires). Any OM
// success closes the circuit immediately.
//
// Fidelity notes (degraded mode is honest, not perfect):
// - 7Timer civil has 3-hour steps (no interpolation — what you see is
//   what the model gave), no sunrise/sunset (renderers null-check them),
//   no timezones: times are shifted by a longitude-estimated offset so
//   all downstream hour math works; off in DST/half-hour zones.
// - Every result carries `source: 'open-meteo' | '7timer' | 'nominatim'`
//   so the UI can badge reserve data (and caches persist it).

import { geocodeCity as omGeocodeCity, isRegionLike } from '../geocoding';
import { sleep } from './netprobe';

const OM_CIRCUIT_TTL_MS = 5 * 60 * 1000;

// Module-level circuit state (one per app session).
const omCircuit = { downUntil: 0 };

function omDown() {
  return Date.now() < omCircuit.downUntil;
}

function tripOmCircuit() {
  omCircuit.downUntil = Date.now() + OM_CIRCUIT_TTL_MS;
}

function closeOmCircuit() {
  omCircuit.downUntil = 0;
}

// ---------------------------------------------------------------------------
// 7Timer civil -> Open-Meteo-shaped forecast.
// ---------------------------------------------------------------------------

const COMPASS_DEG = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

// 7Timer `weather` strings end with day/night and use its own vocabulary;
// map to WMO codes inside the buckets our UI understands:
// clear=0, cloudy 1-3, fog 45, rain 51-67/80-82, snow 71-77, thunder 95+.
function seventimerCode(entry) {
  const w = String(entry?.weather || '');
  const base = w.replace(/day$|night$/, '');
  const amount = Number(entry?.prec_amount ?? 0);
  const prec = String(entry?.prec_type || 'none');
  switch (base) {
    case 'clear': return 0;
    case 'pcloudy': return 1;
    case 'mcloudy': return 2;
    case 'cloudy': return 3;
    case 'humid': return 45; // haze/mist bucket (fog colors + fog phenomena)
    case 'lightrain': return 61;
    case 'oshower':
    case 'ishower': return amount >= 5 ? 81 : 80;
    case 'lightsnow': return 71;
    case 'rain': return amount >= 5 ? 65 : 63;
    case 'snow': return amount >= 5 ? 75 : 73;
    case 'rainsnow': return 67;
    case 'ts': return 95;
    case 'tsrain': return 95;
    default:
      // Unknown string: fall back to precipitation + cloud signals.
      if (prec === 'snow') return 71;
      if (prec === 'rain') return 61;
      const cc = Number(entry?.cloudcover ?? 0);
      if (cc >= 7) return 3;
      if (cc >= 4) return 2;
      if (cc >= 2) return 1;
      return 0;
  }
}

function seventimerIsDay(entry) {
  const w = String(entry?.weather || '');
  if (/day$/.test(w)) return 1;
  if (/night$/.test(w)) return 0;
  return null; // caller falls back to hour heuristic
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// "2026092618" (UTC) -> ms epoch.
function parseStInit(init) {
  const s = String(init || '');
  if (!/^\d{10}$/.test(s)) return null;
  return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10));
}

function toIsoLocal(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

export function seventimerToForecast(st, latitude, longitude) {
  const series = Array.isArray(st?.dataseries) ? st.dataseries : [];
  if (series.length === 0 || parseStInit(st?.init) === null) {
    throw new Error('7Timer: empty series');
  }
  const initMs = parseStInit(st.init);
  // Longitude-estimated offset (degraded-mode approximation, see header).
  const estOffsetSec = Math.round(longitude / 15) * 3600;
  const nowShifted = Date.now() + estOffsetSec * 1000;

  const enriched = series.map((e) => {
    const absMs = initMs + Number(e.timepoint || 0) * 3600 * 1000 + estOffsetSec * 1000;
    let isDay = seventimerIsDay(e);
    if (isDay === null) {
      const h = new Date(absMs).getUTCHours();
      isDay = h >= 6 && h < 21 ? 1 : 0;
    }
    return { ...e, absMs, iso: toIsoLocal(absMs), code: seventimerCode(e), isDay };
  });

  // Expand 3h anchors to 1h steps (linear temp, nearest code) so the hourly
  // strip reads exactly like the primary provider's. Values between model
  // outputs are interpolated — standard practice, not observations.
  const hourlyTime = [];
  const hourlyTemp = [];
  const hourlyCode = [];
  const lerpTemp = (a, b, f) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.round((a + (b - a) * f) * 10) / 10;
    }
    return typeof a === 'number' ? a : b ?? null;
  };
  for (let i = 0; i < enriched.length; i++) {
    const a = enriched[i];
    const b = enriched[i + 1];
    const span = b ? Math.max(1, Math.round((b.absMs - a.absMs) / 3600000)) : 1;
    for (let h = 0; h < span; h++) {
      const f = span === 1 ? 0 : h / span;
      hourlyTime.push(toIsoLocal(a.absMs + h * 3600000));
      hourlyTemp.push(lerpTemp(a.temp2m, b?.temp2m, f));
      hourlyCode.push(f < 0.5 ? a.code : (b ? b.code : a.code));
    }
  }

  // "Now": last step at or before now, else the first step.
  let cur = enriched[0];
  for (const e of enriched) {
    if (e.absMs <= nowShifted) cur = e;
    else break;
  }

  // Daily aggregates from 3h steps, grouped by fake-local date.
  const days = new Map();
  for (const e of enriched) {
    const day = e.iso.slice(0, 10);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(e);
  }
  const dailyTime = [];
  const dailyCode = [];
  const dailyMax = [];
  const dailyMin = [];
  for (const [day, list] of days) {
    const temps = list.map((e) => e.temp2m).filter((t) => typeof t === 'number');
    dailyTime.push(day);
    // Noon step's code represents the day; fallback to first entry.
    let rep = list[0];
    let bestDist = Infinity;
    for (const e of list) {
      const h = +e.iso.slice(11, 13);
      const dist = Math.abs(h - 12);
      if (dist < bestDist) {
        bestDist = dist;
        rep = e;
      }
    }
    dailyCode.push(rep.code);
    dailyMax.push(temps.length ? Math.round(Math.max(...temps)) : null);
    dailyMin.push(temps.length ? Math.round(Math.min(...temps)) : null);
  }

  const windMs = Number(cur?.wind10m?.speed);
  return {
    source: '7timer',
    utc_offset_seconds: estOffsetSec,
    current_weather: {
      temperature: typeof cur?.temp2m === 'number' ? cur.temp2m : null,
      weathercode: cur.code,
      is_day: cur.isDay,
      time: cur.iso,
      windspeed: Number.isFinite(windMs) ? Math.round(windMs * 3.6 * 10) / 10 : null,
      winddirection: COMPASS_DEG[String(cur?.wind10m?.direction || '').toUpperCase()] ?? null,
    },
    hourly: {
      time: hourlyTime,
      temperature_2m: hourlyTemp,
      weathercode: hourlyCode,
    },
    daily: {
      time: dailyTime,
      weathercode: dailyCode,
      temperature_2m_max: dailyMax,
      temperature_2m_min: dailyMin,
    },
  };
}

async function fetchSeventimer(lat, lon, fetchFn) {
  const data = await fetchFn(
    `https://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`
  );
  return seventimerToForecast(data, lat, lon);
}

// Canonical full forecast (the shape WeatherApp.fetchWeather returns).
// Tries Open-Meteo unless the circuit is down, validates minimal shape,
// falls back to 7Timer. Never returns null — throws when both legs fail.
//
// The light `?current=` shape (used by the 20-city phenomena poll) is
// normalized to `current_weather` so all consumers read one contract.
export async function fetchForecast(lat, lon, fetchFn, omUrl) {
  if (!omDown()) {
    try {
      const data = await fetchFn(omUrl);
      const cw =
        data?.current_weather ||
        (data?.current
          ? {
              temperature: data.current.temperature_2m,
              weathercode: data.current.weather_code,
            }
          : null);
      if (cw) {
        closeOmCircuit();
        return { ...data, current_weather: cw, source: 'open-meteo' };
      }
    } catch (e) {
      tripOmCircuit();
    }
  }
  // 7Timer is a free hobby service: occasionally slower than a single
  // timeout. One retry (warm connection, 400ms gap) cures most transient
  // failures; if both attempts die the error propagates to the caller's
  // offline path as before.
  try {
    return await fetchSeventimer(lat, lon, fetchFn);
  } catch (e) {
    await sleep(400);
    return await fetchSeventimer(lat, lon, fetchFn);
  }
}

// ---------------------------------------------------------------------------
// Search with Nominatim fallback (Open-Meteo-shaped hit or null).
// ---------------------------------------------------------------------------

function nominatimTypeToFeatureCode(type, cls) {
  const t = String(type || '').toLowerCase();
  const c = String(cls || '').toLowerCase();
  // Region-like (callers reject these via isRegionLike, same as OM regions).
  if (t === 'country' || t === 'state' || t === 'county' || t === 'administrative' || c === 'boundary') {
    return 'ADM2';
  }
  return 'PPL';
}

function nominatimToHit(item) {
  if (!item || item.lat === undefined || item.lon === undefined) return null;
  const addr = item.address || {};
  const name =
    item.namedetails?.name ||
    addr.city || addr.town || addr.village || addr.hamlet || addr.municipality ||
    addr.suburb || addr.county || addr.state || addr.country ||
    String(item.display_name || '').split(',')[0].trim();
  if (!name) return null;
  return {
    name,
    country: addr.country || '',
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    feature_code: nominatimTypeToFeatureCode(item.type, item.class),
  };
}

async function searchNominatim(query, lang, fetchFn) {
  const data = await fetchFn(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=${lang || 'ru'}`
  );
  if (!Array.isArray(data) || data.length === 0) return null;
  let regionFallback = null;
  for (const item of data) {
    const hit = nominatimToHit(item);
    if (!hit || !Number.isFinite(hit.latitude) || !Number.isFinite(hit.longitude)) continue;
    if (!isRegionLike(hit)) return hit;
    if (!regionFallback) regionFallback = hit;
  }
  return regionFallback;
}

// Same contract as geocodeCity: best city, region-like object, or null.
// OM first (transliteration magic included), Nominatim when OM yields
// nothing usable. Throws only when BOTH legs fail at network level and
// OM produced nothing — callers treat null as "not found".
export async function searchCity(query, lang, fetchFn) {
  const q = String(query || '').trim();
  if (!q) return null;
  let omError = null;
  try {
    const hit = await omGeocodeCity(q, lang, fetchFn);
    if (hit) return { ...hit, source: 'open-meteo' };
  } catch (e) {
    omError = e;
  }
  try {
    const hit = await searchNominatim(q, lang, fetchFn);
    if (hit) return { ...hit, source: 'nominatim' };
  } catch (e) {}
  if (omError) throw omError;
  return null;
}
