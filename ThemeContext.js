import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveTheme, authorTheme, APP_THEME_KEY, THEME_MODES } from './themes';

const ThemeContext = createContext({ theme: authorTheme, setThemeMode: () => {}, themeMode: 'author', loaded: false });

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('author');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(APP_THEME_KEY);
        if (saved === 'auto') {
          setThemeModeState('author');
        } else if (THEME_MODES.some((m) => m.value === saved)) {
          setThemeModeState(saved);
        }
      } catch (e) {
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = useCallback(async (value) => {
    setThemeModeState(value);
    try {
      await AsyncStorage.setItem(APP_THEME_KEY, value);
    } catch (e) {
    }
  }, []);

  const theme = useMemo(() => resolveTheme(themeMode), [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, setThemeMode, themeMode, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
