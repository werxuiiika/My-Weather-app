export const APP_THEME_KEY = 'appTheme';

export const THEME_MODES = [
  { value: 'author', label: 'Оригинальная', desc: 'Тема, созданная разработчиком' },
  { value: 'dark', label: 'Тёмная', desc: 'Нейтральная графитовая тема' },
  { value: 'light', label: 'Светлая', desc: 'Светлая версия оригинальной темы' },
];

export const authorTheme = {
  key: 'author', mode: 'dark',
  background: '#1c2333', surface: '#2a3248', surfaceAlt: '#202840',
  surfaceRaised: '#232b40', border: '#262e45',
  text: '#ffffff', textSecondary: '#aab3cc', textMuted: '#7f8db0',
  accent: '#4a90d9', accent2: '#38b06b', onAccent: '#ffffff',
  dim: 'rgba(8, 11, 20, 0.5)',
};

export const graphiteTheme = {
  key: 'dark', mode: 'dark',
  background: '#14171d', surface: '#1f242c', surfaceAlt: '#1a1f27',
  surfaceRaised: '#232933', border: '#2a303b',
  text: '#ffffff', textSecondary: '#a9b1bd', textMuted: '#7c8698',
  accent: '#4a90d9', accent2: '#38b06b', onAccent: '#ffffff',
  dim: 'rgba(0, 0, 0, 0.5)',
};

export const lightTheme = {
  key: 'light', mode: 'light',
  background: '#f2f5fb', surface: '#ffffff', surfaceAlt: '#e9eef8',
  surfaceRaised: '#ffffff', border: '#dfe6f2',
  text: '#1c2333', textSecondary: '#4d5872', textMuted: '#8590aa',
  accent: '#3573c2', accent2: '#25945a', onAccent: '#ffffff',
  dim: 'rgba(15, 22, 40, 0.35)',
};

export function resolveTheme(mode) {
  if (mode === 'light') return lightTheme;
  if (mode === 'dark') return graphiteTheme;
  return authorTheme;
}
