// Full-screen connectivity diagnostics (Settings → "Connection check").
//
// Replaces the earlier modal version: on some devices taps inside the
// bottom-sheet modal were silently swallowed (Close dead, Run needing a
// second tap), while a native-stack screen gets reliable touch handling
// plus the header back button and the hardware back key for free.
//
// Behavior: auto-runs on every entry (useFocusEffect), rows fill in live,
// footer offers Run-again + Copy-report. Probe logic lives in
// utils/netprobe.js (shared next with the fallback circuit).

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ScreenWrapper from './ScreenWrapper';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import {
  NETPROBE_ENDPOINTS,
  INTER_PROBE_GAP_MS,
  probeEndpoint,
  sleep,
} from './utils/netprobe';

const APP_VERSION = require('./package.json').version;

function verdictColor(verdict, theme) {
  if (verdict === 'ok') return theme.accent2;
  if (verdict === 'timeout' || verdict === 'http') return '#FF9F0A';
  return theme.danger;
}

export default function NetworkDiagnosticsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const fs = useFontSize();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const cancelled = useRef(false);
  const runId = useRef(0);

  const startRun = useCallback(() => {
    const myId = ++runId.current;
    cancelled.current = false;
    setRunning(true);
    setResults({});
    setCopied(false);
    (async () => {
      for (const ep of NETPROBE_ENDPOINTS) {
        if (cancelled.current || runId.current !== myId) break;
        const r = await probeEndpoint(ep);
        if (cancelled.current || runId.current !== myId) break;
        setResults((prev) => ({ ...prev, [ep.id]: r }));
        await sleep(INTER_PROBE_GAP_MS);
      }
      // Only the owning generation clears the flag: a stale loop can
      // neither leave it stuck nor steal it from a newer run.
      if (runId.current === myId) setRunning(false);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      startRun();
      return () => {
        cancelled.current = true;
      };
    }, [startRun])
  );

  const done = NETPROBE_ENDPOINTS.every((ep) => results[ep.id]);
  const doneCount = NETPROBE_ENDPOINTS.filter((ep) => results[ep.id]).length;
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
    const lines = NETPROBE_ENDPOINTS.map((ep) => {
      const r = results[ep.id];
      return `${t(`netdiagEp_${ep.id}`)}: ${r ? verdictText(r) : '…'}`;
    });
    lines.push(`--- ${summary ?? ''} (MyWeather ${APP_VERSION}, ${new Date().toISOString()})`);
    await Clipboard.setStringAsync(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceRaised, width: fs.iconSize * 1.5, height: fs.iconSize * 1.5 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontSize: fs.large }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {t('netdiagTitle')}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: fs.spacing, paddingBottom: fs.spacing * 2 }}>
        <Text style={[styles.subtitle, { color: theme.textMuted, fontSize: fs.base * 0.85 }]}>
          {t('netdiagDesc')}
        </Text>
        <Text style={[styles.progress, { color: theme.textMuted, fontSize: fs.base * 0.85 }]}>
          {t('netdiagProgress', { done: doneCount, total: NETPROBE_ENDPOINTS.length })}
        </Text>

        {NETPROBE_ENDPOINTS.map((ep) => {
          const r = results[ep.id];
          const color = r ? verdictColor(r.verdict, theme) : theme.textMuted;
          return (
            <View key={ep.id} style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.epName, { color: theme.text, fontSize: fs.base * 0.92 }]}>
                {t(`netdiagEp_${ep.id}`)}
              </Text>
              {r ? (
                <Text style={[styles.verdict, { color, fontSize: fs.base * 0.8 }]}>{verdictText(r)}</Text>
              ) : (
                <ActivityIndicator size="small" color={theme.accent} />
              )}
            </View>
          );
        })}

        <Text style={[styles.summary, { color: theme.text, fontSize: fs.base * 0.92 }]}>
          {summary ?? ' '}
        </Text>

        <View style={styles.footer}>
          {done ? (
            <TouchableOpacity
              style={[styles.btnGhost, { borderColor: theme.border }]}
              onPress={copyResults}
            >
              <Text style={[styles.btnGhostText, { color: theme.text, fontSize: fs.base * 0.9 }]}>
                {copied ? t('netdiagCopied') : t('netdiagCopy')}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.accent }, running ? { opacity: 0.5 } : null]}
            onPress={startRun}
            disabled={running}
          >
            <Text style={[styles.btnText, { color: theme.onAccent, fontSize: fs.base * 0.9 }]}>
              {running ? t('netdiagRunning') : t('netdiagRun')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 12,
  },
  progress: {
    marginTop: 2,
    marginBottom: 8,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 48,
    borderBottomWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  epName: {
    flex: 1,
    fontWeight: '600',
  },
  verdict: {
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'right',
    flexShrink: 1,
  },
  summary: {
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
    minHeight: 44,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 10,
  },
  btnText: {
    fontWeight: '700',
  },
  btnGhost: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 10,
    borderWidth: 1,
  },
  btnGhostText: {
    fontWeight: '600',
  },
});
