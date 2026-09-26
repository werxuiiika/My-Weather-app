// In-app connectivity diagnostics (Settings → "Connection check").
//
// Why this exists: "no internet" in the wild is rarely a dead phone —
// usually one egress leg is blocked (provider DPI, half-dead VPN tunnel,
// per-app VPN bypass). This modal probes every endpoint the app depends
// on and classifies EACH failure, so the user (and support) sees the real
// cause instead of guessing: Works / Timeout (packets blackholed) /
// DNS (system resolver fails while Google DoH answers or not) /
// Blocked (DNS resolves but TCP/TLS is torn down — SNI/DPI style) /
// HTTP error (server-side throttle) / Offline (no route at all).
//
// Probes run SEQUENTIALLY with a 1.1s gap: parallel TLS handshakes
// through a VPN often fail spuriously, and Nominatim's usage policy
// requires ≤ 1 req/s with an identifying User-Agent (sent on met.no +
// Nominatim probes; both are also the future fallback providers).

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

const APP_VERSION = require('../package.json').version;
const UA = `MyWeatherApp/${APP_VERSION} (https://github.com/werxuiiika/My-Weather-app)`;
const PROBE_TIMEOUT_MS = 8000;
const DNS_TIMEOUT_MS = 6000;
const INTER_PROBE_GAP_MS = 1100;

const ENDPOINTS = [
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
    headers: { 'User-Agent': UA },
  },
  {
    id: 'nominatim',
    host: 'nominatim.openstreetmap.org',
    url: 'https://nominatim.openstreetmap.org/search?q=Berlin&format=json&limit=1',
    headers: { 'User-Agent': UA },
  },
  {
    id: 'bigdatacloud',
    host: 'api.bigdatacloud.net',
    url: 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=55.75&longitude=37.61&localityLanguage=en',
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
async function checkDns(host) {
  try {
    const res = await fetchWithTimeout(`https://dns.google/resolve?name=${host}&type=A`, DNS_TIMEOUT_MS);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.Status === 0 && Array.isArray(data?.Answer) && data.Answer.length > 0;
  } catch (e) {
    return false;
  }
}

async function probeEndpoint(ep) {
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

const VERDICT_COLORS = { ok: null, timeout: '#FF9F0A', http: '#FF9F0A', dns: null, blocked: null, offline: null };
// ok -> theme.accent2, dns/blocked/offline -> theme.danger (resolved at render).

function verdictColor(verdict, theme) {
  if (verdict === 'ok') return theme.accent2;
  if (verdict === 'timeout' || verdict === 'http') return VERDICT_COLORS[verdict];
  return theme.danger;
}

export default function NetworkDiagnostics({ visible, onClose, theme, fs }) {
  const { t } = useTranslation();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);

  const run = async () => {
    cancelled.current = false;
    setRunning(true);
    setResults({});
    setCopied(false);
    for (const ep of ENDPOINTS) {
      if (cancelled.current) break;
      const r = await probeEndpoint(ep);
      if (cancelled.current) break;
      setResults((prev) => ({ ...prev, [ep.id]: r }));
      await new Promise((res) => setTimeout(res, INTER_PROBE_GAP_MS));
    }
    if (!cancelled.current) setRunning(false);
  };

  useEffect(() => {
    if (visible) {
      run();
    } else {
      cancelled.current = true;
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const done = ENDPOINTS.every((ep) => results[ep.id]);
  const list = Object.values(results);
  const omOk = ['om-forecast', 'om-geocoding'].every((id) => results[id]?.verdict === 'ok');
  const anyOk = list.some((r) => r.verdict === 'ok');
  const allOffline = done && list.length > 0 && list.every((r) => r.verdict === 'offline');

  let summary = null;
  if (running && !done) summary = t('netdiagRunning');
  else if (allOffline) summary = t('netdiagSummaryOffline');
  else if (omOk) summary = t('netdiagSummaryOk');
  else if (anyOk) summary = t('netdiagSummaryPartial');
  else if (done) summary = t('netdiagSummaryDown');

  const verdictText = (r) => {
    switch (r.verdict) {
      case 'ok':
        return `${t('netdiagOk')} · ${r.ms} ms`;
      case 'timeout':
        return t('netdiagTimeout');
      case 'dns':
        return t('netdiagDns');
      case 'blocked':
        return t('netdiagBlocked');
      case 'http':
        return `${t('netdiagHttp')} ${r.detail ?? ''}`.trim();
      case 'offline':
        return t('netdiagOffline');
      default:
        return '…';
    }
  };

  const copyResults = async () => {
    const lines = ENDPOINTS.map((ep) => {
      const r = results[ep.id];
      return `${t(`netdiagEp_${ep.id}`)}: ${r ? verdictText(r) : '…'}`;
    });
    lines.push(`--- ${summary ?? ''} (MyWeather ${APP_VERSION}, ${new Date().toISOString()})`);
    await Clipboard.setStringAsync(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '85%',
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    title: {
      color: theme.text,
      fontSize: fs.large,
      fontWeight: '700',
      marginBottom: 4,
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: fs.base * 0.85,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 12,
    },
    epName: {
      flex: 1,
      color: theme.text,
      fontSize: fs.base * 0.92,
      fontWeight: '600',
    },
    verdict: {
      fontSize: fs.base * 0.8,
      fontWeight: '600',
      marginLeft: 8,
      textAlign: 'right',
      flexShrink: 1,
    },
    summary: {
      color: theme.text,
      fontSize: fs.base * 0.92,
      fontWeight: '700',
      marginTop: 14,
      marginBottom: 4,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 14,
    },
    btn: {
      backgroundColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginLeft: 10,
    },
    btnText: {
      color: theme.onAccent,
      fontWeight: '700',
      fontSize: fs.base * 0.9,
    },
    btnGhost: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginLeft: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    btnGhostText: {
      color: theme.text,
      fontWeight: '600',
      fontSize: fs.base * 0.9,
    },
  });

  return (
    <Modal transparent visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('netdiagTitle')}</Text>
        <Text style={styles.subtitle}>{t('netdiagDesc')}</Text>
        <ScrollView>
          {ENDPOINTS.map((ep) => {
            const r = results[ep.id];
            const color = r ? verdictColor(r.verdict, theme) : theme.textMuted;
            return (
              <View key={ep.id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.epName}>{t(`netdiagEp_${ep.id}`)}</Text>
                {r ? (
                  <Text style={[styles.verdict, { color }]}>{verdictText(r)}</Text>
                ) : (
                  <ActivityIndicator size="small" color={theme.accent} />
                )}
              </View>
            );
          })}
        </ScrollView>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnGhost} onPress={onClose}>
            <Text style={styles.btnGhostText}>{t('netdiagClose')}</Text>
          </TouchableOpacity>
          {done ? (
            <TouchableOpacity style={styles.btnGhost} onPress={copyResults}>
              <Text style={styles.btnGhostText}>{copied ? t('netdiagCopied') : t('netdiagCopy')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={run} disabled={running}>
            <Text style={styles.btnText}>{running ? t('netdiagRunning') : t('netdiagRun')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
