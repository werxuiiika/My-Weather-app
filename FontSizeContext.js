import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = 'fontSizeScale';

export const FONT_SIZE_LEVELS = [0.8, 0.9, 1.0, 1.15, 1.3];
const DEFAULT_LEVEL_INDEX = 2;
export const DEFAULT_SCALE = FONT_SIZE_LEVELS[DEFAULT_LEVEL_INDEX];

const BASE_FONT_SIZE = 16;
const SMALL_FONT_SIZE = 13;
const LARGE_FONT_SIZE = 22;
const SPACING_UNIT = 16;
const ICON_SIZE_BASE = 26;
const CARD_HEIGHT_BASE = 80;

export const FontSizeContext = createContext({
  base: BASE_FONT_SIZE,
  small: SMALL_FONT_SIZE,
  large: LARGE_FONT_SIZE,
  spacing: SPACING_UNIT,
  iconSize: ICON_SIZE_BASE,
  cardHeight: CARD_HEIGHT_BASE,
  fontScale: DEFAULT_SCALE,
  setFontScale: () => {},
  fontSizeLevel: DEFAULT_LEVEL_INDEX,
  setFontSizeLevel: () => {},
});

export const FontSizeProvider = ({ children }) => {
  const [fontScale, setFontScaleState] = useState(DEFAULT_SCALE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadFontScale = async () => {
      try {
        const saved = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 0.8 && parsed <= 1.3) {
            setFontScaleState(parsed);
          }
        }
      } catch (e) {
      } finally {
        setLoaded(true);
      }
    };
    loadFontScale();
  }, []);

  const setFontScale = useCallback(async (value) => {
    setFontScaleState(value);
    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, String(value));
    } catch (e) {
    }
  }, []);

  const fontSizeLevel = useMemo(() => {
    const idx = FONT_SIZE_LEVELS.indexOf(fontScale);
    return idx >= 0 ? idx : DEFAULT_LEVEL_INDEX;
  }, [fontScale]);

  const setFontSizeLevel = useCallback(async (level) => {
    const clamped = Math.max(0, Math.min(level, FONT_SIZE_LEVELS.length - 1));
    await setFontScale(FONT_SIZE_LEVELS[clamped]);
  }, [setFontScale]);

  const value = useMemo(() => ({
    base: BASE_FONT_SIZE * fontScale,
    small: SMALL_FONT_SIZE * fontScale,
    large: LARGE_FONT_SIZE * fontScale,
    spacing: SPACING_UNIT * fontScale,
    iconSize: ICON_SIZE_BASE * fontScale,
    cardHeight: CARD_HEIGHT_BASE * fontScale,
    fontScale,
    setFontScale,
    fontSizeLevel,
    setFontSizeLevel,
    loaded,
  }), [fontScale, setFontScale, fontSizeLevel, setFontSizeLevel, loaded]);

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);

export default FontSizeContext;
