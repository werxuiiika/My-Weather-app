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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMP_UNIT_OPTIONS = [
  { value: 'C', labelKey: 'tempUnits.C.label', descKey: 'tempUnits.C.desc' },
  { value: 'F', labelKey: 'tempUnits.F.label', descKey: 'tempUnits.F.desc' },
];

const WIND_UNIT_OPTIONS = [
  { value: 'kmh', labelKey: 'windUnits.kmh.label', descKey: 'windUnits.kmh.desc' },
  { value: 'ms', labelKey: 'windUnits.ms.label', descKey: 'windUnits.ms.desc' },
  { value: 'mph', labelKey: 'windUnits.mph.label', descKey: 'windUnits.mph.desc' },
  { value: 'knots', labelKey: 'windUnits.knots.label', descKey: 'windUnits.knots.desc' },
  { value: 'beaufort', labelKey: 'windUnits.beaufort.label', descKey: 'windUnits.beaufort.desc' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ru', labelKey: 'russian' },
  { value: 'en', labelKey: 'english' },
];

const MENU_STYLE_OPTIONS = [
  { value: 'center', labelKey: 'menuStyle.center' },
  { value: 'bottom', labelKey: 'menuStyle.bottom' },
  { value: 'inline', labelKey: 'menuStyle.inline' },
];

const APP_VERSION = require('./package.json').version;
const APP_ICON_SOURCE = require('./assets/icon.png');
const GITHUB_URL = 'https://github.com/werxuiiika/My-Weather-app';
const MENU_STYLE_KEY = 'menuStyle';
const DEFAULT_MENU_STYLE = 'center';

function GithubIcon({ size = 22, color }) {
  const { theme } = useTheme();
  return <Ionicons name="logo-github" size={size} color={color || theme.text} />;
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
      marginRight: 10,
    },
    radioOuterInactive: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: theme.border,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 10,
    },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent },
     pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
     pickerOptionTextWrap: { flex: 1 },
     pickerOptionLabel: { fontSize: 15, fontWeight: '600', color: theme.text },
     pickerOptionDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
   });
 }

function BottomSheet({ visible, onClose, title, options, selectedValue, onSelect, tr, theme, insets }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 22, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: screenHeight, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(onClose);
    }
  }, [visible, translateY, opacity, onClose, screenHeight]);

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
        <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: theme.border, alignSelf: 'center', marginTop: 10, marginBottom: 12 }} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginBottom: 14 }}>{title}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16 }}
            onPress={() => { onSelect(opt.value); onClose(); }}
            activeOpacity={0.6}
          >
            <View style={selectedValue === opt.value ? {
              width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginRight: 10,
            } : {
              width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 10,
            }}>
              {selectedValue === opt.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} />}
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, flex: 1 }}>{tr(opt.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}

function CenteredModal({ visible, onClose, title, options, selectedValue, onSelect, tr, theme }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(onClose);
    }
  }, [visible, scale, opacity, onClose]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center', opacity }} />
      </TouchableWithoutFeedback>
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <View style={{
          backgroundColor: theme.surface,
          borderRadius: 20,
          width: '80%',
          maxWidth: 300,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 24,
          paddingHorizontal: 18,
          paddingVertical: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginBottom: 14 }}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}
              onPress={() => { onSelect(opt.value); onClose(); }}
              activeOpacity={0.6}
            >
              <View style={selectedValue === opt.value ? {
                width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12,
              } : {
                width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                {selectedValue === opt.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{tr(opt.labelKey)}</Text>
                {opt.descKey ? <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{tr(opt.descKey)}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

function InlinePicker({ visible, options, selectedValue, onSelect, onClose, tr, theme, styles }) {
  if (!visible) return null;
  return (
    <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 16, overflow: 'hidden', marginTop: 6 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={styles.pickerOption}
          onPress={() => { onSelect(opt.value); onClose(); }}
          activeOpacity={0.6}
        >
          <View style={selectedValue === opt.value ? styles.radioOuter : styles.radioOuterInactive}>
            {selectedValue === opt.value && <View style={styles.radioInner} />}
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, flex: 1 }}>{tr(opt.labelKey)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SettingsMenuWrapper({
  menuStyle, visible, onClose, title, options, selectedValue, onSelect, tr, theme, insets, styles, icon, desc,
}) {
  const chevronDir = visible && menuStyle === 'inline' ? '▲' : '›';

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.6}
        onPress={() => {
          if (menuStyle === 'inline') {
            if (visible) onClose(); else onSelect(null);
          } else {
            onSelect(null);
          }
        }}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <Text style={styles.chevron}>{chevronDir}</Text>
      </TouchableOpacity>

      {menuStyle === 'inline' && visible && (
        <InlinePicker
          visible={visible}
          options={options}
          selectedValue={selectedValue}
          onSelect={onSelect}
          onClose={onClose}
          tr={tr}
          theme={theme}
          styles={styles}
        />
      )}

      {menuStyle === 'bottom' && (
        <BottomSheet
          visible={visible}
          onClose={onClose}
          title={title}
          options={options}
          selectedValue={selectedValue}
          onSelect={onSelect}
          tr={tr}
          theme={theme}
          insets={insets}
        />
      )}

      {menuStyle === 'center' && (
        <CenteredModal
          visible={visible}
          onClose={onClose}
          title={title}
          options={options}
          selectedValue={selectedValue}
          onSelect={onSelect}
          tr={tr}
          theme={theme}
        />
      )}
    </>
  );
}

async function loadMenuStyle() {
  try {
    const v = await AsyncStorage.getItem(MENU_STYLE_KEY);
    return (v && ['center', 'bottom', 'inline'].includes(v)) ? v : DEFAULT_MENU_STYLE;
  } catch (e) {
    return DEFAULT_MENU_STYLE;
  }
}

async function saveMenuStyle(value) {
  try {
    await AsyncStorage.setItem(MENU_STYLE_KEY, value);
  } catch (e) {}
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t: tr, i18n: i18nInstance } = useTranslation();
  const { theme, setThemeMode, themeMode } = useTheme();
  const { tempUnit, windUnit, setTempUnit, setWindUnit } = useSettings();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [rememberCity, setRememberCity] = useState(true);
  const [menuStyle, setMenuStyle] = useState(DEFAULT_MENU_STYLE);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showTempPicker, setShowTempPicker] = useState(false);
  const [showWindPicker, setShowWindPicker] = useState(false);
  const [showMenuStylePicker, setShowMenuStylePicker] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadMenuStyle();
      setMenuStyle(saved);
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

  const handleThemeSelect = async (value) => {
    if (value !== null) {
      await setThemeMode(value);
      setShowThemePicker(false);
    } else {
      setShowThemePicker(true);
    }
  };

  const handleLanguageSelect = async (value) => {
    if (value !== null) {
      await changeLanguage(value);
      setShowLanguagePicker(false);
    } else {
      setShowLanguagePicker(true);
    }
  };

  const handleTempSelect = async (value) => {
    if (value !== null) {
      await setTempUnit(value);
      setShowTempPicker(false);
    } else {
      setShowTempPicker(true);
    }
  };

  const handleWindSelect = async (value) => {
    if (value !== null) {
      await setWindUnit(value);
      setShowWindPicker(false);
    } else {
      setShowWindPicker(true);
    }
  };

  const handleMenuStyleSelect = async (value) => {
    if (value !== null) {
      await saveMenuStyle(value);
      setMenuStyle(value);
      setShowMenuStylePicker(false);
    } else {
      setShowMenuStylePicker(true);
    }
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

  const currentMenuStyleLabel = useMemo(() => {
    const found = MENU_STYLE_OPTIONS.find((o) => o.value === menuStyle);
    return found ? tr(found.labelKey) : tr('menuStyle.center');
  }, [menuStyle, tr]);

  const currentLanguageLabel = useMemo(() => {
    const found = LANGUAGE_OPTIONS.find((o) => o.value === i18nInstance.language);
    return found ? tr(found.labelKey) : tr('english');
  }, [i18nInstance.language, tr]);

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
          <SettingsMenuWrapper
            menuStyle={menuStyle}
            visible={showThemePicker}
            onClose={() => setShowThemePicker(false)}
            onSelect={handleThemeSelect}
            title={tr('appTheme')}
            icon="🎨"
            desc={currentThemeLabel}
            options={THEME_MODES}
            selectedValue={themeMode}
            tr={tr}
            theme={theme}
            insets={insets}
            styles={styles}
          />

          <SettingsMenuWrapper
            menuStyle={menuStyle}
            visible={showLanguagePicker}
            onClose={() => setShowLanguagePicker(false)}
            onSelect={handleLanguageSelect}
            title={tr('language')}
            icon="🌐"
            desc={currentLanguageLabel}
            options={LANGUAGE_OPTIONS}
            selectedValue={i18nInstance.language}
            tr={tr}
            theme={theme}
            insets={insets}
            styles={styles}
          />

          <SettingsMenuWrapper
            menuStyle={menuStyle}
            visible={showMenuStylePicker}
            onClose={() => setShowMenuStylePicker(false)}
            onSelect={handleMenuStyleSelect}
            title={tr('menuStyle')}
            icon="📋"
            desc={currentMenuStyleLabel}
            options={MENU_STYLE_OPTIONS}
            selectedValue={menuStyle}
            tr={tr}
            theme={theme}
            insets={insets}
            styles={styles}
          />
        </View>

        <Text style={styles.sectionTitle}>{tr('units')}</Text>
        <View style={styles.cardStack}>
          <SettingsMenuWrapper
            menuStyle={menuStyle}
            visible={showTempPicker}
            onClose={() => setShowTempPicker(false)}
            onSelect={handleTempSelect}
            title={tr('temperature')}
            icon="🌡️"
            desc={currentTempLabel}
            options={TEMP_UNIT_OPTIONS}
            selectedValue={tempUnit}
            tr={tr}
            theme={theme}
            insets={insets}
            styles={styles}
          />

          <SettingsMenuWrapper
            menuStyle={menuStyle}
            visible={showWindPicker}
            onClose={() => setShowWindPicker(false)}
            onSelect={handleWindSelect}
            title={tr('windSpeed')}
            icon="💨"
            desc={currentWindLabel}
            options={WIND_UNIT_OPTIONS}
            selectedValue={windUnit}
            tr={tr}
            theme={theme}
            insets={insets}
            styles={styles}
          />
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
