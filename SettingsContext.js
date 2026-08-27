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
const DYNAMIC_BG_KEY = 'dynamic_bg';
const DEFAULT_TEMP_UNIT = 'C';
const DEFAULT_WIND_UNIT = 'kmh';
const DEFAULT_DYNAMIC_BG = true;

export const TEMP_UNITS = ['C', 'F'];
export const WIND_UNITS = ['kmh', 'ms', 'mph', 'knots', 'beaufort'];

export const SettingsProvider = ({ children }) => {
  const [tempUnit, setTempUnit] = useState(DEFAULT_TEMP_UNIT);
  const [windUnit, setWindUnit] = useState(DEFAULT_WIND_UNIT);
  const [dynamicBgEnabled, setDynamicBgEnabled] = useState(DEFAULT_DYNAMIC_BG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTemp, savedWind, savedDynBg] = await Promise.all([
          AsyncStorage.getItem(TEMP_UNIT_KEY),
          AsyncStorage.getItem(WIND_UNIT_KEY),
          AsyncStorage.getItem(DYNAMIC_BG_KEY),
        ]);
        if (TEMP_UNITS.includes(savedTemp)) {
          setTempUnit(savedTemp);
        }
        if (WIND_UNITS.includes(savedWind)) {
          setWindUnit(savedWind);
        }
        if (savedDynBg !== null) {
          setDynamicBgEnabled(savedDynBg === 'true');
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

  const persistDynamicBg = useCallback(
    async (value) => {
      setDynamicBgEnabled(value);
      if (loaded) {
        try {
          await AsyncStorage.setItem(DYNAMIC_BG_KEY, value ? 'true' : 'false');
        } catch (e) {
          // ignore write errors
        }
      }
    },
    [loaded],
  );

  return (
    <SettingsContext.Provider
      value={{
        tempUnit,
        windUnit,
        dynamicBgEnabled,
        setTempUnit: persistTempUnit,
        setWindUnit: persistWindUnit,
        setDynamicBgEnabled: persistDynamicBg,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
