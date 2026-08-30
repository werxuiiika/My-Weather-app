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
  PanResponder,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from './i18n';
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';
import { useFontSize, FONT_SIZE_LEVELS } from './FontSizeContext';
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

function buildStyles(theme, fs) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: fs.spacing * 1.0,
      paddingVertical: fs.spacing * 0.75,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerBtn: {
      width: fs.spacing * 2.5, height: fs.spacing * 2.5, borderRadius: 12,
      backgroundColor: theme.surfaceRaised,
      alignItems: 'center', justifyContent: 'center',
    },
    headerBtnText: { fontSize: fs.base * 1.375, color: theme.textSecondary },
    headerTitle: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text, marginLeft: fs.spacing * 0.75 },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: fs.spacing * 1.25, paddingTop: fs.spacing * 0.5, paddingBottom: fs.spacing * 2.125 },
    hero: { alignItems: 'center', paddingTop: fs.spacing * 0.875, paddingBottom: fs.spacing * 0.5, marginBottom: fs.spacing },
    heroIcon: {
      width: 90,
      height: 90,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      marginBottom: fs.spacing * 0.75,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
      overflow: 'hidden',
    },
    heroTitle: { fontSize: fs.large * 1.15, fontWeight: '700', color: theme.text },
    heroAuthor: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.25 },
    heroVersion: { fontSize: fs.small * 0.846, color: theme.textMuted, marginTop: fs.spacing * 0.125 },
    sectionTitle: {
      fontSize: fs.small, fontWeight: '700', color: theme.textMuted,
      letterSpacing: 0.8, marginBottom: fs.spacing * 0.625, marginTop: fs.spacing * 1.375,
    },
    cardStack: { gap: fs.spacing * 0.625 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingHorizontal: fs.spacing,
      paddingVertical: fs.spacing * 0.875,
      paddingRight: fs.spacing * 0.75,
      minHeight: 70 * fs.fontScale,
    },
    cardTextWrap: { flex: 1, marginRight: fs.spacing * 1.25, paddingRight: 60 * fs.fontScale, flexWrap: 'wrap' },
    cardTitle: { fontSize: fs.base, fontWeight: '600', color: theme.text },
    cardDesc: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.25, lineHeight: fs.small * 1.384 },
    iconWrap: {
      width: fs.spacing * 2.625, height: fs.spacing * 2.625, borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center', justifyContent: 'center',
      marginRight: fs.spacing * 0.75,
    },
    iconEmoji: { fontSize: fs.iconSize * 0.77 },
    chevron: { fontSize: fs.base * 1.5, color: theme.textMuted, marginLeft: 'auto' },
    radioOuter: {
      width: fs.spacing * 1.375, height: fs.spacing * 1.375, borderRadius: fs.spacing * 0.6875,
      borderWidth: 2, borderColor: theme.accent,
      alignItems: 'center', justifyContent: 'center',
      marginRight: fs.spacing * 0.625,
    },
    radioOuterInactive: {
      width: fs.spacing * 1.375, height: fs.spacing * 1.375, borderRadius: fs.spacing * 0.6875,
      borderWidth: 2, borderColor: theme.border,
      alignItems: 'center', justifyContent: 'center',
      marginRight: fs.spacing * 0.625,
    },
    radioInner: { width: fs.spacing * 0.625, height: fs.spacing * 0.625, borderRadius: fs.spacing * 0.3125, backgroundColor: theme.accent },
     pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: fs.spacing * 0.6875 },
     pickerOptionTextWrap: { flex: 1 },
     pickerOptionLabel: { fontSize: fs.base, fontWeight: '600', color: theme.text },
     pickerOptionDesc: { fontSize: fs.small, color: theme.textMuted, marginTop: fs.spacing * 0.125 },
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

function CenteredModal({ visible, onClose, title, options, selectedValue, onSelect, tr, theme, fs }) {
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
          <Text style={{ fontSize: fs.small * 0.9375, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginBottom: fs.spacing * 0.875 }}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: fs.spacing * 0.6875 }}
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
                <Text style={{ fontSize: fs.base * 0.9375, fontWeight: '600', color: theme.text }}>{tr(opt.labelKey)}</Text>
                {opt.descKey ? <Text style={{ fontSize: fs.small * 0.769, color: theme.textMuted, marginTop: fs.spacing * 0.125 }}>{tr(opt.descKey)}</Text> : null}
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

function FontSizeSlider({ value, onValueChange, theme, fs }) {
  const SLIDER_W = 200;
  const TRACK_H = 6;
  const THUMB_W = 18;
  const STEP_W = (SLIDER_W - THUMB_W) / (FONT_SIZE_LEVELS.length - 1);

  const levelIndex = useMemo(() => {
    const idx = FONT_SIZE_LEVELS.indexOf(value);
    return idx >= 0 ? idx : 2;
  }, [value]);

  const thumbX = levelIndex * STEP_W;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const clampedX = Math.max(0, Math.min(gesture.dx, SLIDER_W - THUMB_W));
        let newLevel = Math.round(clampedX / STEP_W);
        newLevel = Math.max(0, Math.min(newLevel, FONT_SIZE_LEVELS.length - 1));
        onValueChange(FONT_SIZE_LEVELS[newLevel]);
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const label = `${Math.round(value * 100)}%`;

  return (
    <View style={{ width: SLIDER_W, alignItems: 'center' }}>
      <Text style={{ fontSize: fs.small, fontWeight: '600', color: theme.text, marginBottom: fs.spacing * 0.625 }}>{label}</Text>
      <View style={{ width: SLIDER_W, height: TRACK_H, backgroundColor: theme.border, borderRadius: TRACK_H / 2 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: thumbX + THUMB_W / 2,
            height: TRACK_H,
            backgroundColor: theme.accent,
            borderRadius: TRACK_H / 2,
          }}
        />
        <View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            left: thumbX,
            top: (TRACK_H - THUMB_W) / 2,
            width: THUMB_W,
            height: THUMB_W,
            borderRadius: THUMB_W / 2,
            backgroundColor: theme.accent,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 5,
          }}
        />
      </View>
    </View>
  );
}

function FontSizeModal({ visible, onClose, fontScale, setFontScale, tr, theme, fs }) {
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
        }}>
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
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: fs.small * 0.9375, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginBottom: fs.spacing * 0.875 }}>{tr('fontSize')}</Text>
          <FontSizeSlider
            value={fontScale}
            onValueChange={setFontScale}
            theme={theme}
            fs={fs}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: fs.spacing * 0.875 }}>
            <Text style={{ fontSize: fs.small * 0.769, color: theme.textMuted }}>{tr('smallFont')}</Text>
            <Text style={{ fontSize: fs.small * 0.769, color: theme.textMuted }}>{tr('largeFont')}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

function SettingsMenuWrapper({
  menuStyle, visible, onClose, title, options, selectedValue, onSelect, tr, theme, insets, styles, icon, desc, fs,
}) {
  const chevronDir = visible && menuStyle === 'inline' ? '▲' : '›';

  return (
    <>
      <TouchableOpacity
        style={styles.card}
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
             fs={fs}
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
          fs={fs}
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
  const fs = useFontSize();
  const { fontScale, setFontScale } = fs;
  const styles = useMemo(() => buildStyles(theme, fs), [theme, fs]);
  const insets = useSafeAreaInsets();

  const [rememberCity, setRememberCity] = useState(true);
  const [menuStyle, setMenuStyle] = useState(DEFAULT_MENU_STYLE);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showTempPicker, setShowTempPicker] = useState(false);
  const [showWindPicker, setShowWindPicker] = useState(false);
  const [showMenuStylePicker, setShowMenuStylePicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);

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
    <SafeAreaView style={styles.safe}>
         <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr('about')}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Image source={APP_ICON_SOURCE} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={styles.heroTitle}>{tr('weather')}</Text>
          <Text style={styles.heroAuthor}>{tr('byAuthor')}</Text>
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
            fs={fs}
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
            fs={fs}
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
            fs={fs}
          />

          <View style={[styles.card, { paddingVertical: fs.spacing * 0.875 }]}>
            <View style={styles.iconWrap}>
              <Ionicons name="text" size={fs.iconSize * 0.77} color={theme.textSecondary} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{tr('fontSize')}</Text>
              <Text style={styles.cardDesc}>{`${Math.round(fontScale * 100)}%`}</Text>
            </View>
            <TouchableOpacity
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => setShowFontSizePicker(true)}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: fs.small * 0.846, fontWeight: '600', color: theme.accent }}>
                {tr('smallFont')} / {tr('largeFont')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
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
            fs={fs}
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
            fs={fs}
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

      <FontSizeModal
        visible={showFontSizePicker}
        onClose={() => setShowFontSizePicker(false)}
        fontScale={fontScale}
        setFontScale={setFontScale}
        tr={tr}
        theme={theme}
        fs={fs}
      />
    </SafeAreaView>
  );
}
