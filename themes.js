import {
  Platform,
  PlatformColor,
  Appearance,
} from 'react-native';
import * as SystemUI from 'expo-system-ui';

export const APP_THEME_KEY = 'appTheme';
export const MATERIAL_YOU_KEY = 'useMaterialYou';

export const THEME_MODES = [
  {
    value: 'auto',
    label: 'Автоматическая',
    desc: 'Следует за светлой/тёмной темой системы',
  },
  {
    value: 'author',
    label: 'Фирменная',
    desc: 'Тёмно-синяя тема приложения',
  },
  {
    value: 'dark',
    label: 'Тёмная',
    desc: 'Нейтральная графитовая тёмная тема',
  },
  {
    value: 'light',
    label: 'Светлая',
    desc: 'Светлая версия фирменной темы',
  },
];

export const authorTheme = {
  key: 'author',
  mode: 'dark',
  background: '#1c2333',
  surface: '#2a3248',
  surfaceAlt: '#202840',
  surfaceRaised: '#232b40',
  border: '#262e45',
  text: '#ffffff',
  textSecondary: '#aab3cc',
  textMuted: '#7f8db0',
  accent: '#4a90d9',
  accent2: '#38b06b',
  onAccent: '#ffffff',
  dim: 'rgba(8, 11, 20, 0.5)',
};

export const graphiteTheme = {
  key: 'dark',
  mode: 'dark',
  background: '#14171d',
  surface: '#1f242c',
  surfaceAlt: '#1a1f27',
  surfaceRaised: '#232933',
  border: '#2a303b',
  text: '#ffffff',
  textSecondary: '#a9b1bd',
  textMuted: '#7c8698',
  accent: '#4a90d9',
  accent2: '#38b06b',
  onAccent: '#ffffff',
  dim: 'rgba(0, 0, 0, 0.5)',
};

export const lightTheme = {
  key: 'light',
  mode: 'light',
  background: '#f2f5fb',
  surface: '#ffffff',
  surfaceAlt: '#e9eef8',
  surfaceRaised: '#ffffff',
  border: '#dfe6f2',
  text: '#1c2333',
  textSecondary: '#4d5872',
  textMuted: '#8590aa',
  accent: '#3573c2',
  accent2: '#25945a',
  onAccent: '#ffffff',
  dim: 'rgba(15, 22, 40, 0.35)',
};

export function getMaterialYouAccents(isDarkMode) {
  if (Platform.OS !== 'android') return null;
  const api = parseInt(Platform.Version, 10);
  if (Number.isNaN(api) || api < 31) return null;
  if (isDarkMode) {
    return {
      accent: PlatformColor('@android:color/system_accent1_200'),
      accent2: PlatformColor('@android:color/system_accent2_200'),
    };
  }
  return {
    accent: PlatformColor('@android:color/system_accent1_700'),
    accent2: PlatformColor('@android:color/system_accent2_700'),
  };
}

export function resolveTheme(mode, systemScheme, useMaterialYou) {
  let base;
  if (mode === 'auto') {
    base = systemScheme === 'light' ? lightTheme : authorTheme;
  } else if (mode === 'light') {
    base = lightTheme;
  } else if (mode === 'dark') {
    base = graphiteTheme;
  } else {
    base = authorTheme;
  }
  if (!useMaterialYou) return base;
  const dyn = getMaterialYouAccents(base.mode === 'dark');
  if (!dyn) return base;
  return {
    ...base,
    accent: dyn.accent,
    accent2: dyn.accent2,
  };
}

export async function detectSystemScheme() {
  try {
    if (
      SystemUI &&
      typeof SystemUI.getSystemColorSchemeAsync === 'function'
    ) {
      const s = await SystemUI.getSystemColorSchemeAsync();
      if (s === 'light' || s === 'dark') return s;
    }
  } catch (e) {}
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}
