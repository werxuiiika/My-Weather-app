import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Linking,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from './i18n';
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';
import { THEME_MODES } from './themes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMP_UNIT_OPTIONS = [
  { value: 'C', labelKey: 'tempUnits.C.label' },
  { value: 'F', labelKey: 'tempUnits.F.label' },
];

const WIND_UNIT_OPTIONS = [
  { value: 'kmh', labelKey: 'windUnits.kmh.label' },
  { value: 'ms', labelKey: 'windUnits.ms.label' },
  { value: 'mph', labelKey: 'windUnits.mph.label' },
  { value: 'knots', labelKey: 'windUnits.knots.label' },
  { value: 'beaufort', labelKey: 'windUnits.beaufort.label' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ru', labelKey: 'russian' },
  { value: 'en', labelKey: 'english' },
];

const APP_VERSION = require('./package.json').version;
const APP_ICON_SOURCE = require('./assets/icon.png');
const GITHUB_URL = 'https://github.com/werxuiiika/My-Weather-app';

function GithubIcon({ size = 22, color }) {
  const { theme } = useTheme();
  return (
    <Image
      source={APP_ICON_SOURCE}
      style={{ width: size, height: size, tintColor: color || theme.text }}
      resizeMode="contain"
    />
  );
}

function buildStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center', justifyContent: 'center',
    },
    headerBtnText: { fontSize: 22, color: theme.textSecondary },
    headerTitle: { fontSize: 22, fontWeight: '700', color: theme.text, marginLeft: 12 },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 },
    hero: { alignItems: 'center', paddingTop: 14, paddingBottom: 8, marginBottom: 16 },
    heroIcon: {
      width: 80, height: 80, borderRadius: 20,
      backgroundColor: theme.surfaceRaised,
      borderWidth: 1, borderColor: theme.border,
      marginBottom: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { fontSize: 26, fontWeight: '700', color: theme.text },
    heroAuthor: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
    heroVersion: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    sectionTitle: {
      fontSize: 13, fontWeight: '700', color: theme.textMuted,
      letterSpacing: 0.8, marginBottom: 10, marginTop: 22,
    },
    cardStack: { gap: 10 },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingRight: 12,
    },
    cardTextWrap: { flex: 1, marginRight: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
    cardDesc: { fontSize: 13, color: theme.textMuted, marginTop: 4, lineHeight: 18 },
    iconWrap: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    iconEmoji: { fontSize: 20 },
    chevron: { fontSize: 24, color: theme.textMuted, marginLeft: 'auto' },
    radioOuter: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: theme.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    radioOuterInactive: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: theme.border,
      alignItems: 'center', justifyContent: 'center',
    },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent },
    pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    pickerOptionLabel: { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1, marginLeft: 10 },
    pickerOptionDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2, marginLeft: 10 },
  });
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t: tr, i18n: i18nInstance } = useTranslation();
  const { theme, setThemeMode, themeMode, loaded } = useTheme();
  const { tempUnit, windUnit, setTempUnit, setWindUnit } = useSettings();
  const styles = useMemo(() => buildStyles(theme), [theme]);

  const [rememberCity, setRememberCity] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showTempPicker, setShowTempPicker] = useState(false);
  const [showWindPicker, setShowWindPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('rememberCity');
        if (v !== null) setRememberCity(v === 'true');
      } catch (e) {}
    })();
  }, []);

  const toggleRemember = async (value) => {
    setRememberCity(value);
    try {
      await AsyncStorage.setItem('rememberCity', value ? 'true' : 'false');
    } catch (e) {}
  };

  const selectLanguage = async (value) => {
    await changeLanguage(value);
    setShowLanguagePicker(false);
  };

  const selectTempUnit = async (value) => {
    await setTempUnit(value);
    setShowTempPicker(false);
  };

  const selectWindUnit = async (value) => {
    await setWindUnit(value);
    setShowWindPicker(false);
  };

  const openGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch (e) {}
  };

  const currentThemeLabel = useMemo(() => {
    const found = THEME_MODES.find((m) => m.value === themeMode);
    return found ? tr(found.labelKey) : tr('themeModes.author.label');
  }, [themeMode, tr]);

  const currentTempLabel = useMemo(() => {
    const found = TEMP_UNIT_OPTIONS.find((o) => o.value === tempUnit);
    return found ? tr(found.labelKey) : tr('tempUnits.C.label');
  }, [tempUnit, tr]);

  const currentWindLabel = useMemo(() => {
    const found = WIND_UNIT_OPTIONS.find((o) => o.value === windUnit);
    return found ? tr(found.labelKey) : tr('windUnits.kmh.label');
  }, [windUnit, tr]);

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr('about')}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Image source={APP_ICON_SOURCE} style={{ width: 56, height: 56 }} resizeMode="contain" />
          </View>
          <Text style={styles.heroTitle}>{tr('weather')}</Text>
          <Text style={styles.heroAuthor}>— {tr('byAuthor')}</Text>
          <Text style={styles.heroVersion}>{tr('version', { version: APP_VERSION })}</Text>
        </View>

        <Text style={styles.sectionTitle}>{tr('settings')}</Text>
        <View style={styles.cardStack}>
          <View style={styles.card}>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('rememberCity')}</Text>
              <Text style={styles.cardDesc}>{tr('rememberCityDesc')}</Text>
            </View>
            <Switch
              value={rememberCity}
              onValueChange={toggleRemember}
              trackColor={{ false: theme.textMuted, true: theme.accent2 }}
              thumbColor="#ffffff"
              ios_backgroundColor={theme.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{tr('interface')}</Text>
        <View style={styles.cardStack}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowThemePicker(!showThemePicker)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🎨</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('appTheme')}</Text>
              <Text style={styles.cardDesc}>{currentThemeLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {showThemePicker && (
            <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1, gap: 4 }}>
                {THEME_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={styles.pickerOption}
                    onPress={() => setThemeMode(mode.value)}
                    activeOpacity={0.6}
                  >
                    <View style={themeMode === mode.value ? styles.radioOuter : styles.radioOuterInactive}>
                      {themeMode === mode.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.pickerOptionLabel}>{tr(mode.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🌐</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('language')}</Text>
              <Text style={styles.cardDesc}>
                {tr(LANGUAGE_OPTIONS.find((o) => o.value === i18nInstance.language)?.labelKey ?? 'english')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1, gap: 4 }}>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <TouchableOpacity
                    key={lang.value}
                    style={styles.pickerOption}
                    onPress={() => selectLanguage(lang.value)}
                    activeOpacity={0.6}
                  >
                    <View style={i18nInstance.language === lang.value ? styles.radioOuter : styles.radioOuterInactive}>
                      {i18nInstance.language === lang.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.pickerOptionLabel}>{tr(lang.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{tr('units')}</Text>
        <View style={styles.cardStack}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowTempPicker(!showTempPicker)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🌡️</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('temperature')}</Text>
              <Text style={styles.cardDesc}>{currentTempLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {showTempPicker && (
            <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1, gap: 4 }}>
                {TEMP_UNIT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerOption}
                    onPress={() => selectTempUnit(opt.value)}
                    activeOpacity={0.6}
                  >
                    <View style={tempUnit === opt.value ? styles.radioOuter : styles.radioOuterInactive}>
                      {tempUnit === opt.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.pickerOptionLabel}>{tr(opt.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowWindPicker(!showWindPicker)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>💨</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('windSpeed')}</Text>
              <Text style={styles.cardDesc}>{currentWindLabel}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {showWindPicker && (
            <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1, gap: 4 }}>
                {WIND_UNIT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerOption}
                    onPress={() => selectWindUnit(opt.value)}
                    activeOpacity={0.6}
                  >
                    <View style={windUnit === opt.value ? styles.radioOuter : styles.radioOuterInactive}>
                      {windUnit === opt.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.pickerOptionLabel}>{tr(opt.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{tr('aboutProject')}</Text>
        <View style={styles.cardStack}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={openGitHub}
          >
            <View style={styles.iconWrap}>
              <GithubIcon size={22} color={theme.text} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('sourceCode')}</Text>
              <Text style={styles.cardDesc}>{tr('githubDesc')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
