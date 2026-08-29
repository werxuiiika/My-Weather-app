import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SettingsContext = createContext();

const TEMP_UNIT_KEY = 'tempUnit';
const WIND_UNIT_KEY = 'windUnit';
const FONT_SIZE_KEY = 'fontSizeScale';
const DEFAULT_TEMP_UNIT = 'C';
const DEFAULT_WIND_UNIT = 'kmh';
const DEFAULT_FONT_SCALE = 1.0;
const MIN_FONT_SCALE = 0.6;
const MAX_FONT_SCALE = 1.8;

export const scaleFont = (size, scale) => size * scale;

export const clampFontScale = (scale) =>
  Math.min(Math.max(scale, MIN_FONT_SCALE), MAX_FONT_SCALE);

export const TEMP_UNITS = ['C', 'F'];
export const WIND_UNITS = ['kmh', 'ms', 'mph', 'knots', 'beaufort'];

export const SettingsProvider = ({ children }) => {
  const [tempUnit, setTempUnit] = useState(DEFAULT_TEMP_UNIT);
  const [windUnit, setWindUnit] = useState(DEFAULT_WIND_UNIT);
  const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTemp, savedWind, savedFontSize] = await Promise.all([
          AsyncStorage.getItem(TEMP_UNIT_KEY),
          AsyncStorage.getItem(WIND_UNIT_KEY),
          AsyncStorage.getItem(FONT_SIZE_KEY),
        ]);
        if (TEMP_UNITS.includes(savedTemp)) {
          setTempUnit(savedTemp);
        }
        if (WIND_UNITS.includes(savedWind)) {
          setWindUnit(savedWind);
        }
        if (typeof savedFontSize === 'number') {
          setFontScale(clampFontScale(savedFontSize));
        } else if (typeof savedFontSize === 'string') {
          const parsed = parseFloat(savedFontSize);
          if (!isNaN(parsed)) setFontScale(clampFontScale(parsed));
        }
      } catch (e) {
        // keep defaults on error
      } finally {
        setLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const persistTempUnit = useCallback(
    async (value) => {
      setTempUnit(value);
      if (loaded && TEMP_UNITS.includes(value)) {
        try {
          await AsyncStorage.setItem(TEMP_UNIT_KEY, value);
        } catch (e) {
          // ignore write errors
        }
      }
    },
    [loaded],
  );

  const persistWindUnit = useCallback(
    async (value) => {
      setWindUnit(value);
      if (loaded && WIND_UNITS.includes(value)) {
        try {
          await AsyncStorage.setItem(WIND_UNIT_KEY, value);
        } catch (e) {
          // ignore write errors
        }
      }
    },
    [loaded],
  );

  const persistFontScale = useCallback(
    async (value) => {
      const clamped = clampFontScale(value);
      setFontScale(clamped);
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, String(clamped));
      } catch (e) {
        // ignore write errors
      }
    },
    [],
  );

  return (
    <SettingsContext.Provider
      value={{
        tempUnit,
        windUnit,
        fontScale,
        setTempUnit: persistTempUnit,
        setWindUnit: persistWindUnit,
        setFontScale: persistFontScale,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;