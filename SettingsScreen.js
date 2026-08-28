import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  Image,
  Linking,
  Modal,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      paddingVertical: 12,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
    },
    sheetHandle: {
      width: 48,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 14,
    },
    sheetOptionsWrap: {
      paddingHorizontal: 16,
    },
  });
}

function BottomSheet({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  tr,
  theme,
  insets,
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = useMemo(() => Math.min(options.length * 60 + 100, screenHeight * 0.6), [options.length, screenHeight]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(sheetHeight);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 22,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(onClose);
    }
  }, [visible, sheetHeight, translateY, opacity, onClose]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', opacity }} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.background,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
          transform: [{ translateY }],
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View style={{
          width: 48,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.border,
          alignSelf: 'center',
          marginTop: 10,
          marginBottom: 12,
        }} />
        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: theme.textMuted,
          textAlign: 'center',
          marginBottom: 14,
        }}>{title}</Text>
        <View>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 16,
              }}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
              activeOpacity={0.6}
            >
              <View style={selectedValue === opt.value ? {
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: theme.accent,
                alignItems: 'center', justifyContent: 'center',
              } : {
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: theme.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {selectedValue === opt.value && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} />
                )}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginLeft: 10, flex: 1 }}>
                {tr(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t: tr, i18n: i18nInstance } = useTranslation();
  const { theme, setThemeMode, themeMode, loaded } = useTheme();
  const { tempUnit, windUnit, setTempUnit, setWindUnit } = useSettings();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [rememberCit, setRememberCity] = useState(true);
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

  const selectThemeMode = async (value) => {
    await setThemeMode(value);
    setShowThemePicker(false);
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
         <View style={[styles.header, { paddingTop: insets.top }]}>
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
              value={rememberCit}
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
            onPress={() => setShowThemePicker(true)}
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

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowLanguagePicker(true)}
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
        </View>

        <Text style={styles.sectionTitle}>{tr('units')}</Text>
        <View style={styles.cardStack}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowTempPicker(true)}
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

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => setShowWindPicker(true)}
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

      <BottomSheet
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        title={tr('appTheme')}
        options={THEME_MODES}
        selectedValue={themeMode}
        onSelect={selectThemeMode}
        tr={tr}
        theme={theme}
        insets={insets}
      />
      <BottomSheet
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        title={tr('language')}
        options={LANGUAGE_OPTIONS}
        selectedValue={i18nInstance.language}
        onSelect={selectLanguage}
        tr={tr}
        theme={theme}
        insets={insets}
      />
      <BottomSheet
        visible={showTempPicker}
        onClose={() => setShowTempPicker(false)}
        title={tr('temperature')}
        options={TEMP_UNIT_OPTIONS}
        selectedValue={tempUnit}
        onSelect={selectTempUnit}
        tr={tr}
        theme={theme}
        insets={insets}
      />
      <BottomSheet
        visible={showWindPicker}
        onClose={() => setShowWindPicker(false)}
        title={tr('windSpeed')}
        options={WIND_UNIT_OPTIONS}
        selectedValue={windUnit}
        onSelect={selectWindUnit}
        tr={tr}
        theme={theme}
        insets={insets}
      />
    </View>
  );
}
