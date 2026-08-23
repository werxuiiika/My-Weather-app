import { useState, useEffect, useRef, useMemo, createContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Alert,
  Animated,
  Easing,
  Switch,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_THEME_KEY,
  MATERIAL_YOU_KEY,
  THEME_MODES,
  resolveTheme,
  authorTheme,
} from './themes';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10000;
const SCREEN_WIDTH = Dimensions.get('window').width;
const APP_VERSION = require('./package.json').version;
const APP_ICON_SOURCE = require('./assets/icon.png');
const GITHUB_URL = 'https://github.com/werxuiiika/My-Weather-app';
const NETWORK_ERROR = 'Нет подключения к интернету. Проверьте настройки сети.';
const TIMEOUT_ERROR = 'Сервер не отвечает. Проверьте подключение или отключите VPN.';
const VPN_WARNING = 'VPN может блокировать подключение. Попробуйте отключить его.';
const VALID_THEME_MODES = ['author', 'dark', 'light'];

const ThemeContext = createContext(authorTheme);

const loadLastCity = async () => { try { return await AsyncStorage.getItem('lastCity'); } catch (e) { return null; } };
const saveLastCity = async (name) => { try { await AsyncStorage.setItem('lastCity', name); } catch (e) {} };
const loadRememberCity = async () => { try { const v = await AsyncStorage.getItem('rememberCity'); return v === null ? true : v === 'true'; } catch (e) { return true; } };
const saveRememberCity = async (value) => { try { await AsyncStorage.setItem('rememberCity', value ? 'true' : 'false'); } catch (e) {} };
const loadAppTheme = async () => {
  try {
    const v = await AsyncStorage.getItem(APP_THEME_KEY);
    if (v === 'auto') return 'author';
    return VALID_THEME_MODES.includes(v) ? v : 'author';
  } catch (e) {
    return 'author';
  }
};
const saveAppTheme = async (value) => { try { await AsyncStorage.setItem(APP_THEME_KEY, value); } catch (e) {} };
const loadMaterialYou = async () => { try { const v = await AsyncStorage.getItem(MATERIAL_YOU_KEY); return v === 'true'; } catch (e) { return false; } };
const saveMaterialYou = async (value) => { try { await AsyncStorage.setItem(MATERIAL_YOU_KEY, value ? 'true' : 'false'); } catch (e) {} };

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } catch (e) {
    if (e instanceof TypeError || (e && e.name === 'AbortError')) {
      const err = new Error(e instanceof TypeError ? NETWORK_ERROR : TIMEOUT_ERROR);
      err.kind = 'network';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

const ICON_COLORS = {
  sun: '#ffd166',
  moon: '#eaf0fc',
  cloudLight: '#c3cee6',
  cloudDark: '#9fb0d6',
  drop: '#5b9bd5',
  snow: '#f2f7ff',
  fog: '#aab6cf',
};

function CloudShape({ x = 0, y = 0, s = 1, fill }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Circle cx={21} cy={33} r={9} fill={fill} />
      <Circle cx={32} cy={27} r={11.5} fill={fill} />
      <Circle cx={43} cy={34} r={8} fill={fill} />
      <Rect x={12} y={37} width={40} height={9} rx={4.5} fill={fill} />
    </G>
  );
}

function SunCore({ x = 0, y = 0, s = 1 }) {
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rays.push(
      <Line key={i}
        x1={x + Math.cos(a) * 13 * s} y1={y + Math.sin(a) * 13 * s}
        x2={x + Math.cos(a) * 18 * s} y2={y + Math.sin(a) * 18 * s}
        stroke={ICON_COLORS.sun} strokeWidth={3 * s} strokeLinecap="round" />
    );
  }
  return (
    <G>
      {rays}
      <Circle cx={x} cy={y} r={9 * s} fill={ICON_COLORS.sun} />
    </G>
  );
}

function MoonCrescent({ transform }) {
  return (
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      fill={ICON_COLORS.moon} transform={transform} />
  );
}

function GithubIcon({ size = 22, color = '#eaf0fc' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path fillRule="evenodd" clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        fill={color} />
    </Svg>
  );
}

function PaletteIcon({ size = 20, color = '#eaf0fc' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zM6.5 12c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
      />
    </Svg>
  );
}

function WeatherIcon({ type = 'clear', isNight = false, size = 96 }) {
  let content = null;
  if (type === 'clear') {
    content = isNight
      ? <MoonCrescent transform="translate(8 8) scale(2)" />
      : <SunCore x={32} y={32} s={1.25} />;
  } else if (type === 'partly') {
    content = isNight ? (
      <G>
        <MoonCrescent transform="translate(20 0) scale(1.5)" />
        <CloudShape fill={ICON_COLORS.cloudDark} />
      </G>
    ) : (
      <G>
        <SunCore x={22} y={20} s={0.85} />
        <CloudShape x={10} y={16} s={0.85} fill={ICON_COLORS.cloudDark} />
      </G>
    );
  } else if (type === 'fog') {
    content = (
      <G>
        <CloudShape y={-6} fill={ICON_COLORS.cloudDark} />
        <Line x1={14} y1={53} x2={50} y2={53} stroke={ICON_COLORS.fog} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={20} y1={59} x2={44} y2={59} stroke={ICON_COLORS.fog} strokeWidth={3.5} strokeLinecap="round" />
      </G>
    );
  } else if (type === 'snow') {
    content = (
      <G>
        <CloudShape y={-2} fill={ICON_COLORS.cloudDark} />
        <Circle cx={22} cy={53} r={2.6} fill={ICON_COLORS.snow} />
        <Circle cx={33} cy={58} r={2.6} fill={ICON_COLORS.snow} />
        <Circle cx={43} cy={52} r={2.6} fill={ICON_COLORS.snow} />
      </G>
    );
  } else if (type === 'thunder') {
    content = (
      <G>
        <CloudShape y={-2} fill={ICON_COLORS.cloudDark} />
        <Path d="M34 42 L26 55 h5 l-2 8 10 -13 h-6 l4 -8 z" fill={ICON_COLORS.sun} />
      </G>
    );
  } else {
    const heavy = type === 'showers';
    content = (
      <G>
        <CloudShape y={-2} fill={heavy ? ICON_COLORS.cloudDark : ICON_COLORS.cloudLight} />
        <Line x1={23} y1={49} x2={20} y2={57} stroke={ICON_COLORS.drop} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={33} y1={51} x2={30} y2={59} stroke={ICON_COLORS.drop} strokeWidth={3.5} strokeLinecap="round" />
        <Line x1={43} y1={49} x2={40} y2={57} stroke={ICON_COLORS.drop} strokeWidth={3.5} strokeLinecap="round" />
        {heavy && (
          <Line x1={28} y1={60} x2={26} y2={64} stroke={ICON_COLORS.drop} strokeWidth={3} strokeLinecap="round" />
        )}
      </G>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {content}
    </Svg>
  );
}

function weathercodeToType(code) {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 86) return 'showers';
  return 'thunder';
}

export default function App() {
  const [isConnected, setIsConnected] = useState(null);
  const isConnectedRef = useRef(null);
  const updateConnection = (value) => {
    isConnectedRef.current = value;
    setIsConnected(value);
  };
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [hostUnreachable, setHostUnreachable] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dismissedMsg, setDismissedMsg] = useState(null);
  const [cityTime, setCityTime] = useState(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [splashRendered, setSplashRendered] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rememberCity, setRememberCity] = useState(true);
  const [appThemeMode, setAppThemeMode] = useState('author');
  const [useMaterialYou, setUseMaterialYou] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const lastRequest = useRef(null);
  const rememberRef = useRef(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const sunRotate = useRef(new Animated.Value(0)).current;
  const settingsOverlayOpacity = useRef(new Animated.Value(0)).current;
  const settingsScreenX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const t = useMemo(
    () => resolveTheme(appThemeMode, null, useMaterialYou),
    [appThemeMode, useMaterialYou]
  );
  const styles = useMemo(() => buildStyles(t), [t]);
  const currentThemeLabel = useMemo(() => {
    const found = THEME_MODES.find((m) => m.value === appThemeMode);
    return found ? found.label : 'Оригинальная';
  }, [appThemeMode]);
  const refreshColors =
    t.mode === 'light' ? ['#3573c2', '#25945a'] : ['#4a90d9', '#38b06b'];
  const switchTrackOff = t.mode === 'light' ? '#c9d3e6' : '#3a4560';
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(sunRotate, { toValue: 1, duration: 6000, useNativeDriver: true })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sunScale, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(sunScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    spin.start();
    pulse.start();
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
      setIsContentVisible(true);
    }, 1500);
    return () => {
      spin.stop();
      pulse.stop();
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const init = async () => {
      const [savedMode, savedMy] = await Promise.all([loadAppTheme(), loadMaterialYou()]);
      if (!active) return;
      setAppThemeMode(savedMode);
      setUseMaterialYou(savedMy);
      setThemeLoaded(true);
      const state = await NetInfo.fetch();
      if (!active) return;
      updateConnection(!!state.isConnected);
      const remember = await loadRememberCity();
      if (!active) return;
      rememberRef.current = remember;
      setRememberCity(remember);
      if (!remember) return;
      const saved = await loadLastCity();
      if (!active || !saved) {
        if (active && !saved) detectMyLocation();
        return;
      }
      setCity(saved);
      doSearch(saved);
    };
    init();
    const unsubscribe = NetInfo.addEventListener((state) => {
      updateConnection(!!state.isConnected);
      if (!state.isConnected) {
        setHostUnreachable(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!isSplashVisible) {
      Animated.timing(splashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setSplashRendered(false);
        }
      );
    }
  }, [isSplashVisible]);
  useEffect(() => {
    if (isContentVisible) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [isContentVisible]);
  useEffect(() => {
    if (!settingsOpen) return;
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(settingsScreenX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [settingsOpen]);
  useEffect(() => {
    if (!themePickerVisible) return;
    Animated.timing(pickerAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [themePickerVisible]);
  const openSettings = () => {
    setSettingsOpen(true);
  };
  const closeSettings = () => {
    if (themePickerVisible) closeThemePicker();
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(settingsScreenX, {
        toValue: SCREEN_WIDTH,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setSettingsOpen(false);
    });
  };
  const openThemePicker = () => {
    pickerAnim.setValue(0);
    setThemePickerVisible(true);
  };
  const closeThemePicker = () => {
    Animated.timing(pickerAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setThemePickerVisible(false);
    });
  };
  const selectThemeMode = async (value) => {
    setAppThemeMode(value);
    await saveAppTheme(value);
    closeThemePicker();
  };
  const toggleRemember = async (value) => {
    setRememberCity(value);
    rememberRef.current = value;
    await saveRememberCity(value);
  };
  const toggleMaterialYou = async (value) => {
    setUseMaterialYou(value);
    await saveMaterialYou(value);
  };
  const openGitHub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch (e) {}
  };
  const geocode = async (query) => {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ru&format=json`
    );
    if (!data.results || data.results.length === 0) {
      throw new Error('Город не найден');
    }
    return data.results[0];
  };
  const reverseGeocode = async (lat, lon) => {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=ru&format=json`
    );
    if (data.results && data.results.length > 0) {
      const p = data.results[0];
      return {
        name: p.name || p.admin1 || 'Текущее местоположение',
        country: p.country || '',
        latitude: lat,
        longitude: lon,
      };
    }
    return {
      name: 'Текущее местоположение',
      country: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat,
      longitude: lon,
    };
  };
  const fetchWeather = async (lat, lon) => {
    const data = await fetchJson(
      `${BASE_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    return data;
  };
  const loadByCoords = async (lat, lon, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [place, data] = await Promise.all([reverseGeocode(lat, lon), fetchWeather(lat, lon)]);
      setWeather({ place, data });
      lastRequest.current = { type: 'coords', lat, lon };
      if (rememberRef.current && place.name && place.name !== 'Текущее местоположение') {
        await saveLastCity(place.name);
      }
    } catch (e) {
      if (isConnectedRef.current === false) {
        setError(NETWORK_ERROR);
      } else if (e.kind === 'network') {
        setError(null);
        setHostUnreachable(true);
      } else {
        setError(e.message || 'Не удалось получить погоду');
      }
      if (!silent) setWeather(null);
    } finally {
      setLoading(false);
    }
  };
  const detectMyLocation = async () => {
    if (isConnectedRef.current === false) {
      setError(NETWORK_ERROR);
      return;
    }
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Доступ к геолокации запрещён. Включите его в настройках или введите город вручную.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      await loadByCoords(latitude, longitude);
    } catch (e) {
      setError('Не удалось определить местоположение. Проверьте, что GPS включён, или введите город вручную.');
    } finally {
      setLocating(false);
    }
  };
  const doSearch = async (query, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const place = await geocode(query);
      const data = await fetchWeather(place.latitude, place.longitude);
      setWeather({ place, data });
      lastRequest.current = { type: 'city', query };
      if (rememberRef.current) {
        await saveLastCity(place.name);
      }
    } catch (e) {
      if (isConnectedRef.current === false) {
        setError(NETWORK_ERROR);
      } else if (e.kind === 'network') {
        setError(null);
        setHostUnreachable(true);
      } else {
        setError(e.message || 'Не удалось получить погоду');
      }
      if (!silent) setWeather(null);
    } finally {
      setLoading(false);
    }
  };
  const search = () => {
    const query = city.trim();
    if (!query) {
      Alert.alert('Введите город', 'Пожалуйста, укажите название города.');
      return;
    }
    doSearch(query);
  };
  const retryConnection = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const state = await NetInfo.fetch();
      updateConnection(!!state.isConnected);
      if (!state.isConnected) return;
      setHostUnreachable(false);
      const last = lastRequest.current;
      if (!last) {
        await detectMyLocation();
      } else if (last.type === 'coords') {
        await loadByCoords(last.lat, last.lon);
      } else {
        await doSearch(last.query);
      }
    } finally {
      setRetrying(false);
    }
  };
  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const last = lastRequest.current;
      if (!last) {
        await detectMyLocation();
      } else if (last.type === 'coords') {
        await loadByCoords(last.lat, last.lon, true);
      } else {
        await doSearch(last.query, true);
      }
    } finally {
      setRefreshing(false);
    }
  };
  const spinInterpolate = sunRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const getSkyIsNight = () => {
    if (weather && weather.data) {
      const d = weather.data;
      const cwTime = d.current_weather && d.current_weather.time;
      if (typeof cwTime === 'string' && cwTime.length >= 13) {
        const h = parseInt(cwTime.slice(11, 13), 10);
        if (!Number.isNaN(h)) return h >= 21 || h < 6;
      }
      const offset =
        typeof d.utc_offset_seconds === 'number' ? d.utc_offset_seconds : 0;
      const now = new Date();
      const cityMs =
        now.getTime() + now.getTimezoneOffset() * 60000 + offset * 1000;
      const h = new Date(cityMs).getHours();
      return h >= 21 || h < 6;
    }
    const h = new Date().getHours();
    return h >= 21 || h < 6;
  };
  const skyIsNight = getSkyIsNight();
  let bannerType = null;
  let bannerMessage = null;
  if (isConnected === false) {
    bannerType = 'offline';
    bannerMessage = NETWORK_ERROR;
  } else if (hostUnreachable) {
    bannerType = 'vpn';
    bannerMessage = VPN_WARNING;
  } else if (error) {
    bannerType = 'gps';
    bannerMessage = error;
  }
  const showBanner = !!bannerMessage && bannerMessage !== dismissedMsg;
  useEffect(() => {
    if (bannerType === 'vpn' || bannerType === 'gps') {
      const timer = setTimeout(() => {
        if (bannerType === 'vpn') setHostUnreachable(false);
        else setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bannerType, bannerMessage]);
  useEffect(() => {
    if (!weather || !weather.data) {
      setCityTime(null);
      return;
    }
    const tick = () => setCityTime(computeCityClock(weather.data));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [weather]);
  const currentIsNight =
    weather &&
    weather.data &&
    weather.data.current_weather &&
    typeof weather.data.current_weather.is_day === 'number'
      ? weather.data.current_weather.is_day === 0
      : skyIsNight;
  const currentType = weather
    ? weathercodeToType(weather.data.current_weather.weathercode)
    : 'clear';
  const conditionFor = (code) => {
    if (code === 0) return 'Ясно';
    if (code <= 3) return 'Облачно';
    if (code <= 48) return 'Туман';
    if (code <= 67) return 'Дождь';
    if (code <= 77) return 'Снег';
    if (code <= 86) return 'Ливень';
    return 'Гроза';
  };
  if (!themeLoaded) {
    return (
      <SafeAreaView style={preloadStyles.safe}>
        <View style={preloadStyles.fill} />
      </SafeAreaView>
    );
  }
  return (
    <ThemeContext.Provider value={t}>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Погода</Text>
            <TouchableOpacity style={styles.gearButton} onPress={openSettings} activeOpacity={0.7}>
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Введите город"
              placeholderTextColor={switchTrackOff}
              value={city}
              onChangeText={setCity}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.button} onPress={search} activeOpacity={0.7}>
              <Text style={styles.buttonText}>Поиск</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.locButton, locating && styles.buttonDisabled]}
            onPress={detectMyLocation}
            disabled={locating}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Определить моё местоположение</Text>
          </TouchableOpacity>
          {showBanner && (
            <View
              style={[
                styles.infoBanner,
                bannerType === 'offline' && styles.infoBannerOffline,
                bannerType === 'vpn' && styles.infoBannerVpn,
              ]}
            >
              <Text
                style={[
                  styles.infoBannerText,
                  bannerType === 'offline' && styles.infoBannerTextOffline,
                ]}
              >
                {bannerMessage}
              </Text>
              <TouchableOpacity style={styles.bannerButton} onPress={retryConnection} disabled={retrying}>
                <Text style={styles.bannerButtonText}>{retrying ? '…' : 'Повторить'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bannerClose} onPress={() => setDismissedMsg(bannerMessage)}>
                <Text style={styles.bannerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {(loading || locating) && (
            <View style={styles.center}>
              <Animated.View
                style={[
                  styles.skyIconWrap,
                  { transform: [{ scale: sunScale }, { rotate: spinInterpolate }] },
                ]}
              >
                <WeatherIcon type="clear" isNight={skyIsNight} size={72} />
              </Animated.View>
              <ActivityIndicator size="large" color={t.accent} />
              <Text style={styles.loadingText}>
                {locating ? 'Определение местоположения...' : 'Загрузка...'}
              </Text>
            </View>
          )}
          {weather && !loading && !locating && (
            <ScrollView
              style={styles.result}
              contentContainerStyle={styles.resultContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={refreshColors[0]}
                  colors={refreshColors}
                  progressBackgroundColor={t.surface}
                  titleColor={t.textSecondary}
                />
              }
            >
              <Text style={styles.cityName}>{weather.place.name}</Text>
              <Text style={styles.subLabel}>
                {weather.place.country} · {weather.place.latitude.toFixed(2)},
                {weather.place.longitude.toFixed(2)}
              </Text>
              {cityTime && <Text style={styles.cityTime}>Местное время: {cityTime}</Text>}
              <View style={styles.bigIconWrap}>
                <WeatherIcon type={currentType} isNight={currentIsNight} size={100} />
              </View>
              <Text style={styles.temperature}>
                {Math.round(weather.data.current_weather.temperature)}°
              </Text>
              <Text style={styles.condition}>
                {conditionFor(weather.data.current_weather.weathercode)}
              </Text>
              <View style={styles.detailRow}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>{weather.data.current_weather.windspeed} км/ч</Text>
                  <Text style={styles.detailLabel}>Ветер</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailValue}>
                    {weather.data.current_weather.is_day ? 'День' : 'Ночь'}
                  </Text>
                  <Text style={styles.detailLabel}>Время суток</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Прогноз на неделю</Text>
              {weather.data.daily.time.map((day, i) => (
                <View key={day} style={styles.forecastRow}>
                  <Text style={styles.forecastDay}>{formatDay(day)}</Text>
                  <View style={styles.forecastIconCell}>
                    <WeatherIcon
                      type={weathercodeToType(weather.data.daily.weathercode[i])}
                      isNight={false}
                      size={26}
                    />
                  </View>
                  <Text style={styles.forecastTemp}>
                    {Math.round(weather.data.daily.temperature_2m_min[i])}° /{' '}
                    {Math.round(weather.data.daily.temperature_2m_max[i])}°
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          {!loading && !locating && !weather && (
            <View style={styles.center}>
              <Text style={styles.hint}>
                Введите название города или определите местоположение
              </Text>
            </View>
          )}
        </Animated.View>
        {splashRendered && (
          <Animated.View
            style={[styles.splash, { opacity: splashOpacity }]}
            pointerEvents={isSplashVisible ? 'auto' : 'none'}
          >
            <Animated.View
              style={[
                styles.splashIconWrap,
                { transform: [{ scale: sunScale }, { rotate: spinInterpolate }] },
              ]}
            >
              <WeatherIcon type="clear" isNight={skyIsNight} size={120} />
            </Animated.View>
            <Text style={styles.splashText}>Определяем погоду...</Text>
          </Animated.View>
        )}
        {settingsOpen && (
          <View style={styles.settingsLayer} pointerEvents="box-none">
            <Animated.View style={[styles.settingsDim, { opacity: settingsOverlayOpacity }]} />
            <Animated.View
              style={[styles.settingsScreen, { transform: [{ translateX: settingsScreenX }] }]}
            >
              <SafeAreaView style={styles.settingsSafe}>
                <View style={styles.settingsHeader}>
                  <TouchableOpacity
                    style={styles.settingsBackButton}
                    onPress={closeSettings}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.settingsBackIcon}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.settingsHeaderTitle}>О приложении</Text>
                </View>
                <ScrollView
                  style={styles.settingsBody}
                  contentContainerStyle={styles.settingsBodyContent}
                >
                  <View style={styles.settingsHero}>
                    <Image source={APP_ICON_SOURCE} style={styles.heroAppIcon} resizeMode="cover" />
                    <Text style={styles.heroTitle}>Погода</Text>
                    <Text style={styles.heroAuthor}>от werxuiiika</Text>
                    <Text style={styles.heroVersion}>Версия {APP_VERSION}</Text>
                  </View>
                  <Text style={styles.settingsSectionTitle}>Настройки</Text>
                  <View style={styles.cardStack}>
                    <View style={styles.aboutCard}>
                      <View style={styles.aboutCardTextWrap}>
                        <Text style={styles.aboutCardTitle}>Запоминать город</Text>
                        <Text style={styles.aboutCardDesc}>
                          Автоматически открывать сохранённый город при запуске
                        </Text>
                      </View>
                      <Switch
                        value={rememberCity}
                        onValueChange={toggleRemember}
                        trackColor={{ false: switchTrackOff, true: t.accent2 }}
                        thumbColor="#ffffff"
                        ios_backgroundColor={switchTrackOff}
                      />
                    </View>
                  </View>
                  <Text style={styles.settingsSectionTitle}>Интерфейс</Text>
                  <View style={styles.cardStack}>
                    <TouchableOpacity
                      style={styles.aboutCard}
                      onPress={openThemePicker}
                      activeOpacity={0.6}
                    >
                      <View style={styles.interfaceIconWrap}>
                        <Text style={styles.interfaceIconEmoji}>🎨</Text>
                      </View>
                      <View style={styles.aboutCardTextWrap}>
                        <Text style={styles.aboutCardTitle}>Тема приложения</Text>
                        <Text style={styles.aboutCardDesc}>{currentThemeLabel}</Text>
                      </View>
                      <Text style={styles.settingsChevron}>›</Text>
                    </TouchableOpacity>
                    <View style={styles.aboutCard}>
                      <View style={styles.interfaceIconWrap}>
                        <PaletteIcon size={20} color={t.text} />
                      </View>
                      <View style={styles.aboutCardTextWrap}>
                        <Text style={styles.aboutCardTitle}>Material You</Text>
                        <Text style={styles.aboutCardDesc}>
                          Цвета системы во всём приложении на Android 12+
                        </Text>
                      </View>
                      <Switch
                        value={useMaterialYou}
                        onValueChange={toggleMaterialYou}
                        trackColor={{ false: switchTrackOff, true: t.accent }}
                        thumbColor="#ffffff"
                        ios_backgroundColor={switchTrackOff}
                      />
                    </View>
                  </View>
                  <Text style={styles.settingsSectionTitle}>О проекте</Text>
                  <View style={styles.cardStack}>
                    <TouchableOpacity
                      style={styles.aboutCard}
                      onPress={openGitHub}
                      activeOpacity={0.6}
                    >
                      <View style={styles.githubIconWrap}>
                        <GithubIcon size={22} color={t.text} />
                      </View>
                      <View style={styles.aboutCardTextWrap}>
                        <Text style={styles.aboutCardTitle}>Исходный код</Text>
                        <Text style={styles.aboutCardDesc}>
                          Баги, предложения и код на GitHub
                        </Text>
                      </View>
                      <Text style={styles.settingsChevron}>›</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                {themePickerVisible && (
                  <View style={styles.pickerLayer} pointerEvents="box-none">
                    <Animated.View style={[styles.pickerBackdrop, { opacity: pickerAnim }]}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={closeThemePicker}
                      />
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.pickerCard,
                        {
                          opacity: pickerAnim,
                          transform: [
                            {
                              scale: pickerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.92, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.pickerTitle}>Тема приложения</Text>
                      {THEME_MODES.map((m) => {
                        const selected = m.value === appThemeMode;
                        return (
                          <TouchableOpacity
                            key={m.value}
                            style={styles.pickerOption}
                            onPress={() => selectThemeMode(m.value)}
                            activeOpacity={0.6}
                          >
                            <View
                              style={[styles.radioOuter, selected && { borderColor: t.accent }]}
                            >
                              {selected && (
                                <View
                                  style={[styles.radioInner, { backgroundColor: t.accent }]}
                                />
                              )}
                            </View>
                            <View style={styles.pickerOptionTextWrap}>
                              <Text style={styles.pickerOptionLabel}>{m.label}</Text>
                              <Text style={styles.pickerOptionDesc}>{m.desc}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </Animated.View>
                  </View>
                )}
              </SafeAreaView>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
}

function computeCityClock(data) {
  if (!data || typeof data.utc_offset_seconds !== 'number') return null;
  const now = new Date();
  const cityMs = now.getTime() + now.getTimezoneOffset() * 60000 + data.utc_offset_seconds * 1000;
  const d = new Date(cityMs);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

const preloadStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1c2333' },
  fill: { flex: 1 },
});

const buildStyles = (t) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.background },
    splash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center' },
    splashIconWrap: { marginBottom: 24 },
    splashText: { color: t.textSecondary, fontSize: 18 },
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    titleRow: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: '700', color: t.text, textAlign: 'center' },
    gearButton: { position: 'absolute', right: 0, top: 10, padding: 6 },
    gearIcon: { fontSize: 26 },
    searchRow: { flexDirection: 'row', marginBottom: 10 },
    input: { flex: 1, height: 48, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 14, color: t.text, fontSize: 16, marginRight: 10 },
    button: { height: 48, paddingHorizontal: 20, backgroundColor: t.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    locButton: { backgroundColor: t.accent2, marginBottom: 16 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '600' },
    infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3cd', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16 },
    infoBannerVpn: { backgroundColor: '#ffe0b2' },
    infoBannerOffline: { backgroundColor: '#fdecea' },
    infoBannerText: { flex: 1, color: '#4a3000', fontSize: 13, fontWeight: '600', marginRight: 8 },
    infoBannerTextOffline: { color: '#7a1c1c' },
    bannerButton: { backgroundColor: '#4a3000', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8 },
    bannerButtonText: { color: '#fff3cd', fontSize: 13, fontWeight: '700' },
    bannerClose: { padding: 4 },
    bannerCloseText: { color: '#4a3000', fontSize: 16, fontWeight: '700' },
    center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    skyIconWrap: { marginBottom: 16 },
    loadingText: { color: t.textMuted, marginTop: 10, fontSize: 16 },
    hint: { color: t.textMuted, fontSize: 16, textAlign: 'center' },
    result: { flex: 1 },
    resultContent: { paddingBottom: 30 },
    cityName: { fontSize: 26, fontWeight: '700', color: t.text, textAlign: 'center' },
    subLabel: { fontSize: 13, color: t.textMuted, textAlign: 'center', marginTop: 2 },
    cityTime: { fontSize: 14, color: t.textSecondary, textAlign: 'center', marginTop: 4 },
    bigIconWrap: { alignItems: 'center', marginTop: 20 },
    temperature: { fontSize: 72, fontWeight: '300', color: t.text, textAlign: 'center' },
    condition: { fontSize: 20, color: t.textSecondary, textAlign: 'center', marginBottom: 20 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
    detailCard: { backgroundColor: t.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
    detailValue: { color: t.text, fontSize: 16, fontWeight: '600' },
    detailLabel: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: t.text, marginTop: 10, marginBottom: 8 },
    forecastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
    forecastDay: { color: t.textSecondary, fontSize: 15, flex: 1 },
    forecastIconCell: { width: 32, alignItems: 'center', marginRight: 12 },
    forecastTemp: { color: t.text, fontSize: 15, fontWeight: '600' },
    settingsLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
    settingsDim: { ...StyleSheet.absoluteFillObject, backgroundColor: t.dim },
    settingsScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.background },
    settingsSafe: { flex: 1 },
    settingsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 46, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: t.border },
    settingsBackButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    settingsBackIcon: { fontSize: 22, color: t.textSecondary },
    settingsHeaderTitle: { fontSize: 22, fontWeight: '700', color: t.text },
    settingsBody: { flex: 1 },
    settingsBodyContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 },
    settingsHero: { alignItems: 'center', paddingTop: 14, paddingBottom: 8, marginBottom: 16 },
    heroAppIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: t.surfaceRaised, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
    heroTitle: { fontSize: 26, fontWeight: '700', color: t.text },
    heroAuthor: { fontSize: 13, color: t.textMuted, marginTop: 4 },
    heroVersion: { fontSize: 11, color: t.textMuted, marginTop: 2 },
    settingsSectionTitle: { fontSize: 13, fontWeight: '700', color: t.textMuted, letterSpacing: 0.8, marginBottom: 10, marginTop: 22 },
    cardStack: { gap: 10 },
    aboutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
    aboutCardTextWrap: { flex: 1, marginRight: 12 },
    aboutCardTitle: { fontSize: 16, fontWeight: '600', color: t.text },
    aboutCardDesc: { fontSize: 13, color: t.textMuted, marginTop: 4, lineHeight: 18 },
    interfaceIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    interfaceIconEmoji: { fontSize: 20 },
    githubIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    settingsChevron: { fontSize: 24, color: t.textMuted, marginLeft: 6 },
    pickerLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    pickerCard: { width: '100%', maxWidth: 360, backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.border, padding: 18 },
    pickerTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    pickerOptionTextWrap: { flex: 1 },
    pickerOptionLabel: { fontSize: 15, fontWeight: '600', color: t.text },
    pickerOptionDesc: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  });
