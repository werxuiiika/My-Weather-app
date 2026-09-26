// Pure endpoint-probing logic shared by the diagnostics screen (and,
// next, the automatic fallback circuit — same verdicts drive it).
//
// Verdicts: ok / timeout (packets blackholed) / dns / blocked (DNS
// resolves but TCP/TLS is torn down — SNI/DPI style) / http (server-side
// status) / offline (no route at all, Google DoH unreachable too).
//
// Probes are meant to run SEQUENTIALLY with INTER_PROBE_GAP_MS between
// them: parallel TLS handshakes through a VPN fail spuriously, and
// Nominatim's usage policy requires ≤ 1 req/s with an identifying
// User-Agent (sent on met.no + Nominatim probes).

const APP_VERSION = require('../package.json').version;
export const NETPROBE_UA = `MyWeatherApp/${APP_VERSION} (https://github.com/werxuiiika/My-Weather-app)`;

export const PROBE_TIMEOUT_MS = 8000;
export const DNS_TIMEOUT_MS = 6000;
export const INTER_PROBE_GAP_MS = 1100;

export const NETPROBE_ENDPOINTS = [
  {
    id: 'om-forecast',
    host: 'api.open-meteo.com',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.61&current=temperature_2m',
  },
  {
    id: 'om-geocoding',
    host: 'geocoding-api.open-meteo.com',
    url: 'https://geocoding-api.open-meteo.com/v1/search?name=Berlin&count=1&language=en&format=json',
  },
  {
    id: 'metno',
    host: 'api.met.no',
    url: 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55.75&lon=37.61',
    headers: { 'User-Agent': NETPROBE_UA },
  },
  {
    id: 'nominatim',
    host: 'nominatim.openstreetmap.org',
    url: 'https://nominatim.openstreetmap.org/search?q=Berlin&format=json&limit=1',
    headers: { 'User-Agent': NETPROBE_UA },
  },
  {
    id: 'bigdatacloud',
    host: 'api.bigdatacloud.net',
    url: 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=55.75&longitude=37.61&localityLanguage=en',
  },
  {
    id: 'seventimer',
    host: 'www.7timer.info',
    url: 'https://www.7timer.info/bin/api.pl?lon=37.61&lat=55.75&product=civil&output=json',
  },
];

async function fetchWithTimeout(url, ms, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

// Ground truth for "is it DNS?": ask Google DoH directly. If DoH resolves
// the host but the endpoint probe failed, the system resolver/route is at
// fault; if DoH fails too, the device has no usable route at all.
export async function checkDns(host) {
  try {
    const res = await fetchWithTimeout(`https://dns.google/resolve?name=${host}&type=A`, DNS_TIMEOUT_MS);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.Status === 0 && Array.isArray(data?.Answer) && data.Answer.length > 0;
  } catch (e) {
    return false;
  }
}

export async function probeEndpoint(ep) {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(ep.url, PROBE_TIMEOUT_MS, ep.headers);
    const ms = Date.now() - started;
    if (res.ok) return { id: ep.id, verdict: 'ok', ms };
    return { id: ep.id, verdict: 'http', detail: res.status, ms };
  } catch (e) {
    const ms = Date.now() - started;
    const timedOut = e?.name === 'AbortError';
    const dnsOk = await checkDns(ep.host);
    if (!dnsOk) return { id: ep.id, verdict: 'offline', ms };
    return { id: ep.id, verdict: timedOut ? 'timeout' : 'blocked', ms };
  }
}

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
