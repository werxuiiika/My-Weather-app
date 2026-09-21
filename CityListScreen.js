import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Alert, StatusBar, ActivityIndicator, RefreshControl, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import ScreenWrapper from './ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { geocodeCity, isOfflineError, isRegionLike } from './geocoding';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import DraggableCityCard from './DraggableCityCard';
import CurrentLocationCard from './CurrentLocationCard';

const SAVED_CITIES_KEY = 'saved_cities_list';
const LAST_SELECTED_CITY_KEY = 'last_selected_city';
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 15000;

// fetch with timeout + single retry. Transient TLS failures (common
// through VPNs) usually succeed on the second attempt.
async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS, retries = 1) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

export default function CityListScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const fs = useFontSize();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  // Saved cities ONLY — the geolocation card lives in `currentLocation`
  // and is never part of this array (not draggable, selectable or deletable).
  const [cities, setCities] = useState([]);
  // Device geolocation weather card. null = unavailable/denied -> no card at all.
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
   const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCities, setSelectedCities] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  // True while a drag gesture is active — FlatList scrolling is locked for
  // that time so the scroll view never fights the pan gesture (that fight
  // shows up as jitter of the whole list mid-drag).
  const [isDragging, setIsDragging] = useState(false);
  // Logical slot of the dragged card. Mirrored into the activeIndex shared
  // value via effect (see below) — never written from the gesture directly,
  // so the base flip and the data flip always land in the same render.
  const [dragBase, setDragBase] = useState(-1);

  const CARD_HEIGHT = 90;

  const activeIndex = useSharedValue(-1);
  const dragOffset = useSharedValue(0);
  // Stable identity of the dragged card (item id survives reorder, unlike
  // the numeric index — see DraggableCityCard).
  const activeId = useSharedValue(null);
  // Drag telemetry ring for offline jitter analysis (see utils/dragTrace).
  const trace = useSharedValue([]);
  // 1 = finger up: neighbour thresholds are frozen, cards only ease back.
  // Set synchronously in onStart/onEnd (zero bridge delay).
  const released = useSharedValue(1);
  const positionsRef = useRef([]);

  // Mutable mirror of the list: the drag gesture object must stay identical
  // across background setCities calls (weather refresh landing mid-drag),
  // otherwise RNGH restarts the active gesture and the card jumps. A plain
  // ref object would be serialized stale into the UI-runtime closure, so the
  // pattern is: stable useCallback (empty deps) + ref read at call time on
  // the JS thread — always fresh data, never a recreated gesture.
  const citiesRef = useRef(cities);
  citiesRef.current = cities;

  const onReorder = useCallback(async (fromIndex, toIndex) => {
    const list = citiesRef.current;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= list.length) return;
    const newCities = [...list];
    const [moved] = newCities.splice(fromIndex, 1);
    newCities.splice(toIndex, 0, moved);
    setCities(newCities);
    await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newCities));
  }, []);

  // Mirror the logical base into the shared value after every render commit.
  // Because React batches the setCities + setDragBase calls below into one
  // render, worklets always observe base and slots from the same generation —
  // the 1–3 frame skew (new base + old slots) that caused the release
  // twitch is structurally impossible.
  useEffect(() => {
    activeIndex.value = dragBase;
  }, [dragBase]);

  // Stable drag-lifecycle entries for the gesture (all empty-deps, so the
  // gesture object is created once and never restarted mid-drag).
  const beginDrag = useCallback((i) => {
    setDragBase(i);
    setIsDragging(true);
  }, []);
  const endDrag = useCallback(() => {
    setDragBase(-1);
    setIsDragging(false);
  }, []);
  const commitReorder = useCallback((fromIndex, toIndex) => {
    onReorder(fromIndex, toIndex);
    setDragBase(toIndex);
  }, [onReorder]);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: fs.spacing,
      paddingVertical: fs.spacing * 0.75,
      borderBottomWidth: 1,
    },
    backButton: {
      width: fs.iconSize * 1.5,
      height: fs.iconSize * 1.5,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: fs.large,
      fontWeight: '700',
      marginLeft: fs.spacing * 0.75,
      flex: 1,
      flexShrink: 1,
    },
    searchRow: {
      flexDirection: 'row',
      paddingHorizontal: fs.spacing,
      paddingVertical: fs.spacing * 0.75,
      alignItems: 'center',
    },
    input: {
      flex: 1,
      height: fs.spacing * 3,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: fs.spacing,
      fontSize: fs.base,
    },
    addButton: {
      width: fs.spacing * 3,
      height: fs.spacing * 3,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: fs.spacing * 0.625,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContainer: {
      paddingHorizontal: fs.spacing,
      paddingTop: fs.spacing * 0.5,
      paddingBottom: fs.spacing * 1.75,
    },
    // Fixed geolocation layer above the list. Android draw order is global
    // by elevation (card itself gets 28 > dragged card's 20); iOS stacks
    // siblings by zIndex, so 30 wins over the whole FlatList subtree.
    locationHeader: {
      paddingHorizontal: fs.spacing,
      paddingTop: fs.spacing * 0.5,
      zIndex: 30,
    },
    cardContainer: {
      marginBottom: fs.spacing,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderTopColor: 'rgba(255, 255, 255, 0.35)',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    cardContainerLight: {
      borderColor: 'rgba(255, 255, 255, 0.85)',
      elevation: 3,
      shadowColor: '#64748b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    blurContainer: {
      flex: 1,
      borderRadius: 28,
      overflow: 'hidden',
      width: '100%',
      height: '100%',
    },
    cardGradient: {
      borderRadius: 28,
      overflow: 'hidden',
    },
    cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: fs.spacing * 1.25,
      paddingVertical: fs.spacing,
      minHeight: fs.cardHeight * 1.375,
    },
    cardLeft: {
      flex: 0.65,
      justifyContent: 'center',
      paddingRight: fs.spacing * 0.5,
    },
    cardRight: {
      flex: 0.35,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },

    cityName: {
      fontSize: fs.large * 1.1,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    cityCondition: {
      fontSize: fs.small * 1.05,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
      flexShrink: 1,
    },
    conditionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    // Xiaomi-style temp block, right-pinned like min/max: right edges
    // coincide, so every "°" lands exactly above the last min/max "°".
    // Proportions match Xiaomi too: min/max is ~1/3 of the big temp, so the
    // bottom line is as wide as (or wider than) the top one and the top
    // digits never stick out past the bottom width.
    cityTemp: {
      fontSize: fs.large * 1.95,
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: fs.large * 2.15,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    // Separate degree mark, glued to the digit (marginLeft 1), its ring
    // top flush with the digit cap height (small positive marginTop).
    // Glued => can't drift away on its own.
    tempDegree: {
      fontSize: fs.large * 1.1,
      fontWeight: '700',
      marginTop: 4,
      marginLeft: 1,
    },
    cityMinMax: {
      fontSize: fs.small * 1.25,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 2,
      fontWeight: '600',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    batchBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: fs.spacing * 1.5,
      paddingVertical: fs.spacing,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    batchDeleteButton: {
      width: '100%',
      borderRadius: 16,
      paddingVertical: fs.spacing * 0.85,
      alignItems: 'center',
      justifyContent: 'center',
    },
    batchDeleteText: {
      color: '#FFFFFF',
      fontSize: fs.base,
      fontWeight: '700',
    },
  }), [theme, fs]);

  useEffect(() => {
    loadSavedCitiesAndRefresh();
    loadCurrentLocation();
  }, [i18n.language]);

  // Shared open-meteo enrichment for a coordinate pair. Returns the weather
  // fields object or null (no usable data). fetchJson errors propagate so
  // callers can apply their own offline/circuit-breaker policy.
  const fetchWeatherForCoords = async (lat, lon) => {
    const weatherData = await fetchJson(
      `${BASE_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    if (!weatherData || !weatherData.current_weather) return null;
    const temp = Math.round(weatherData.current_weather.temperature);
    const min = weatherData.daily?.temperature_2m_min ? Math.round(weatherData.daily.temperature_2m_min[0]) : '';
    const max = weatherData.daily?.temperature_2m_max ? Math.round(weatherData.daily.temperature_2m_max[0]) : '';
    const code = weatherData.current_weather.weathercode;
    const isNight = weatherData.current_weather.is_day === 0;
    return {
      temp: `${temp}`,
      minMax: min !== '' && max !== '' ? `${max}° / ${min}°` : '',
      condition: getWeatherConditionText(code),
      weathercode: code,
      isNight,
    };
  };

  const loadSavedCitiesAndRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await AsyncStorage.getItem(SAVED_CITIES_KEY);
      let list = [];
      if (data) {
        list = JSON.parse(data);
      } else {
        list = [
          { id: '1', name: 'Москва' },
          { id: '2', name: 'Санкт-Петербург' },
          { id: '3', name: 'Сочи' },
        ];
      }
      
      const currentLang = i18n.language || 'ru';
      // Fast-fail offline: no point burning through timeouts/retries per
      // city, just show the stored list as-is.
      const showStored = () => setCities(list);
      try {
        const netState = await NetInfo.fetch();
        if (netState && netState.isConnected === false) {
          showStored();
          return;
        }
      } catch {}
      // NetInfo lies when a VPN interface is up but DNS is blocked, so
      // probe the API once with a short timeout before the slow loop.
      try {
        await fetchJson(
          `${BASE_URL}?latitude=0&longitude=0&current_weather=true&timezone=auto`,
          5000,
          0
        );
      } catch (e) {
        if (isOfflineError(e)) {
          showStored();
          return;
        }
        // Transient error: fall through and let the per-city loop try.
      }
      // Sequential refresh: parallel TLS handshakes through a VPN often
      // fail with SSLHandshakeException, so go one city at a time.
      // circuitOpen stops burning timeouts on the rest if the connection
      // drops mid-refresh.
      let circuitOpen = false;
      const updatedList = [];
      for (const city of list) {
        if (circuitOpen) {
          updatedList.push(city);
          continue;
        }
        try {
          // STRICT: a saved city's name is frozen at add time and is NEVER
          // rewritten on refresh. Refresh uses stored coordinates only —
          // no geocoding, no reverse-geocoding (both can return a district
          // like "Прионежский район" or "Бор" instead of the real city).
          let lat = city.latitude;
          let lon = city.longitude;
          if (lat === undefined || lon === undefined) {
            // Legacy entry without coordinates: one explicit lookup.
            // Region hits are ignored: a stored city must keep pointing
            // at a real populated place, never at a country center.
            const hit = await geocodeCity(city.name, currentLang, fetchJson);
            if (hit && !isRegionLike(hit)) {
              lat = hit.latitude;
              lon = hit.longitude;
            }
          }

          if (lat !== undefined && lon !== undefined) {
            const enrichment = await fetchWeatherForCoords(lat, lon);
            if (enrichment) {
              updatedList.push({
                ...city,
                latitude: lat,
                longitude: lon,
                name: city.name,
                ...enrichment,
              });
              continue;
            }
          }
        } catch (e) {
          // Offline errors are expected: keep the stored data quietly
          // instead of spamming LogBox warnings (one per city), and stop
          // trying the remaining cities (circuit breaker).
          if (!isOfflineError(e)) {
            console.warn(`Failed to refresh city ${city.name}:`, e?.message || e);
          } else {
            circuitOpen = true;
          }
        }
        updatedList.push(city);
      }

      setCities(updatedList);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Resolve a human-readable place name for coordinates.
  // 1. Platform reverse-geocoder (expo-location, free, no key).
  // 2. BigDataCloud reverse API with the app language.
  // 3. Last resort: coordinate string (flagged, card becomes non-tappable).
  const resolvePlaceName = async (latitude, longitude, lang) => {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = Array.isArray(places) && places.length > 0 ? places[0] : null;
      const name = p?.city || p?.district || p?.subregion || p?.region || p?.name;
      if (name) return { text: name, isFallback: false };
    } catch (e) {}
    try {
      const data = await fetchJson(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${lang || 'ru'}`
      );
      const name = data?.city || data?.locality || data?.principalSubdivision || data?.countryName;
      if (name) return { text: name, isFallback: false };
    } catch (e) {}
    return {
      text: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      isFallback: true,
    };
  };

  // GEOLOCATION STREAM (top card). Shows ONLY when coordinates were
  // successfully resolved AND weather loaded. Any failure (denied permission,
  // timeout, offline) -> null -> no card in the render tree at all.
  // Runs on screen open and on pull-to-refresh, independent of the saved list.
  const loadCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLocation(null);
        return;
      }
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('location timeout')), 12000)),
      ]);
      const { latitude, longitude } = position.coords;
      const currentLang = i18n.language || 'ru';
      const enrichment = await fetchWeatherForCoords(latitude, longitude);
      if (!enrichment) {
        setCurrentLocation(null);
        return;
      }
      const name = await resolvePlaceName(latitude, longitude, currentLang);
      setCurrentLocation({
        id: '__current_location__',
        name: name.text,
        latitude,
        longitude,
        isCoordinateFallback: name.isFallback,
        ...enrichment,
      });
    } catch (e) {
      setCurrentLocation(null);
    }
  };

  // Solid fallback (no-gradient design); gradient experiment below.
  const getWeatherCardColor = (code, isNight) => {
    const isLight = theme.mode === 'light';
    const c = code ?? 2;
    if (isNight) return '#232f45';
    // Clear sky
    if (c === 0) return isLight ? '#7cc0ee' : '#2471a3';
    // Cloudy / overcast
    if (c <= 3) return isLight ? '#b9c9d8' : '#4a6b8a';
    // Fog
    if (c <= 48) return isLight ? '#c3cad4' : '#5d6d7e';
    // Drizzle / rain
    if (c <= 67) return isLight ? '#7d9fc4' : '#2e5f8a';
    // Snow
    if (c <= 77) return isLight ? '#cfe3f7' : '#6b7f99';
    // Showers
    if (c <= 82) return isLight ? '#8ba9cc' : '#33608c';
    // Thunderstorm
    return isLight ? '#9aa0c3' : '#4a4a8a';
  };

  const getWeatherIcon = (code, isNight) => {
    const c = code ?? 2;
    if (c === 0) return isNight ? 'moon' : 'sunny';
    if (c <= 3) {
      if (c === 1) return isNight ? 'cloudy-night' : 'partly-sunny';
      return 'cloudy';
    }
    if (c <= 48) return 'cloudy';
    if (c <= 67) return 'rainy';
    if (c <= 77) return 'snow';
    if (c <= 82) return 'rainy';
    return 'thunderstorm';
  };

  const getWeatherConditionText = (code) => {
    if (code === 0) return t('condition.clear');
    if (code <= 3) return t('condition.cloudy');
    if (code <= 48) return t('condition.fog');
    if (code <= 67) return t('condition.rain');
    if (code <= 77) return t('condition.snow');
    if (code <= 82) return t('condition.showers');
    return t('condition.thunder');
  };

  const handleAddCity = async () => {
    if (!searchQuery.trim()) return;
    const cityName = searchQuery.trim();
    const currentLang = i18n.language || 'ru';
    try {
      setIsLoading(true);
      // searchQuery is captured in cityName up front and reused for every
      // fallback step, so the retries use the exact same input.
      // 1. Current language -> 2. English -> 3. transliterated variants.
      const hit = await geocodeCity(cityName, currentLang, fetchJson);

      if (!hit) {
        Alert.alert(t('cities.error'), t('cities.city_not_found'));
        setIsLoading(false);
        return;
      }
      if (isRegionLike(hit)) {
        Alert.alert(t('cities.error'), t('enterCityNotCountry'));
        setIsLoading(false);
        return;
      }
      const { latitude, longitude, name } = hit;
      const weatherData = await fetchJson(
        `${BASE_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
      );
      const temp = weatherData?.current_weather ? Math.round(weatherData.current_weather.temperature) : 0;
      const min = weatherData?.daily?.temperature_2m_min ? Math.round(weatherData.daily.temperature_2m_min[0]) : '';
      const max = weatherData?.daily?.temperature_2m_max ? Math.round(weatherData.daily.temperature_2m_max[0]) : '';
      const code = weatherData?.current_weather?.weathercode || 0;
      const isNight = weatherData?.current_weather?.is_day === 0;

      const newCity = {
        id: Date.now().toString(),
        name: name || cityName,
        latitude,
        longitude,
        temp: `${temp}`,
        minMax: min !== '' && max !== '' ? `${max}° / ${min}°` : '',
        condition: getWeatherConditionText(code),
        weathercode: code,
        isNight,
      };

      const updated = [...cities, newCity];
      setCities(updated);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updated));
      setSearchQuery('');
    } catch (e) {
      Alert.alert(t('cities.error'), t('cities.add_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLongPressCity = (id, name, index) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedCities(new Set([id]));
    } else {
      toggleSelectCity(id);
    }
  };

  const handlePressCity = (id, name, index) => {
    if (isSelectionMode) {
      toggleSelectCity(id);
    } else {
      handleSelectCity(name);
    }
  };

  const moveCity = async (fromIndex, toIndex) => {
    if (fromIndex === 0 || toIndex === 0) return; // index 0 is protected
    if (toIndex < 1 || toIndex >= cities.length) return;
    const newCities = [...cities];
    const [moved] = newCities.splice(fromIndex, 1);
    newCities.splice(toIndex, 0, moved);
    setCities(newCities);
    await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newCities));
  };

  const toggleSelectCity = (id) => {
    setSelectedCities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPluralSelectedText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
      return t('cities.selected_count_one', { count });
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return t('cities.selected_count_few', { count });
    }
    return t('cities.selected_count_many', { count });
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedCities(new Set());
  };

  const handlePromptBatchDelete = () => {
    if (selectedCities.size === 0) return;
    setDeleteTarget({ count: selectedCities.size });
  };

  const handleConfirmDelete = async () => {
    if (isSelectionMode) {
      if (selectedCities.size === 0) return;
      const updated = cities.filter(c => !selectedCities.has(c.id));
      setCities(updated);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updated));
      setIsSelectionMode(false);
      setSelectedCities(new Set());
      setDeleteTarget(null);
    } else {
      if (!deleteTarget) return;
      const updated = cities.filter(c => c.id !== deleteTarget.id);
      setCities(updated);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updated));
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleSelectCity = async (cityName) => {
    try {
      await AsyncStorage.setItem(LAST_SELECTED_CITY_KEY, cityName);
      navigation.navigate('Tabs', { screen: 'weather', params: { selectedCity: cityName } });
    } catch (e) {
      navigation.navigate('Tabs', { screen: 'weather' });
    }
  };

  const renderItem = ({ item, index }) => {
    return (
       <DraggableCityCard
        item={item}
        index={index}
        isSelectionMode={isSelectionMode}
        isSelected={selectedCities.has(item.id)}
        theme={theme}
        fs={fs}
        t={t}
        onSelectToggle={handlePressCity}
        onLongPressCity={handleLongPressCity}
        dragOffset={dragOffset}
        activeIndex={activeIndex}
        activeId={activeId}
        beginDrag={beginDrag}
        endDrag={endDrag}
        commitReorder={commitReorder}
        trace={trace}
        released={released}
         itemCount={cities.length}
       />
    );
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceRaised }]}
          onPress={() => isSelectionMode ? cancelSelectionMode() : navigation.goBack()}
        >
          <Ionicons name={isSelectionMode ? "close" : "arrow-back"} size={22} color={theme.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {isSelectionMode ? getPluralSelectedText(selectedCities.size) : t('cities.title')}
        </Text>
        {isSelectionMode && (
          <TouchableOpacity onPress={cancelSelectionMode} style={{ paddingHorizontal: fs.spacing * 0.5 }}>
            <Text style={{ color: theme.tint || '#3a7bd5', fontSize: fs.base, fontWeight: '600' }}>
              {t('cities.cancel')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search / Add Bar */}
      {!isSelectionMode && (
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceRaised, color: theme.text, borderColor: theme.border }]}
            placeholder={t('cities.add_placeholder')}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAddCity}
          />
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.tint || '#3a7bd5' }]} onPress={handleAddCity}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Fixed geolocation header: lives OUTSIDE the FlatList so it never
          scrolls, never shifts during reorder, and always draws above the
          dragged card (higher elevation / zIndex = "слои" effect). */}
      {currentLocation ? (
        <View style={styles.locationHeader}>
          <CurrentLocationCard
            item={currentLocation}
            theme={theme}
            fs={fs}
            t={t}
            style={{ elevation: 28 }}
            onPress={currentLocation.isCoordinateFallback
              ? undefined
              : () => handleSelectCity(currentLocation.name)}
          />
        </View>
      ) : null}

      {isLoading && cities.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.tint || '#3a7bd5'} />
        </View>
      ) : (
        <FlatList
          data={cities}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={renderItem}
          style={{ flex: 1 }}
          scrollEnabled={!isDragging}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSavedCitiesAndRefresh(); loadCurrentLocation(); }} />
          }
        />
      )}

      {isSelectionMode && selectedCities.size > 0 && (
        <View style={styles.batchBottomBar}>
          <TouchableOpacity
            style={[styles.batchDeleteButton, { backgroundColor: theme.danger || '#FF453A' }]}
            onPress={handlePromptBatchDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.batchDeleteText}>
              {t('cities.delete')} ({selectedCities.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDeleteModal
        visible={deleteTarget !== null}
        cityName={deleteTarget?.name}
        count={deleteTarget?.count || selectedCities.size}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </ScreenWrapper>
  );
}
