import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import ScreenWrapper from './ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';
import { geocodeCity } from './geocoding';

const SAVED_CITIES_KEY = 'saved_cities_list';
const LAST_SELECTED_CITY_KEY = 'last_selected_city';
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 15000;

// Resolve a localized city name from coordinates. BigDataCloud supports
// localityLanguage (ru/en/...) and needs no API key.
async function resolveCityName(lat, lon, lang) {
  try {
    const data = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang || 'ru'}`,
      10000,
      0
    );
    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

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

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    tempRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cityTemp: {
      fontSize: fs.large * 2.2,
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: fs.large * 2.4,
    },
    tempDegree: {
      fontSize: fs.large * 1.1,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: -4,
      marginLeft: 1,
    },
    cityMinMax: {
      fontSize: fs.small * 0.95,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 2,
      fontWeight: '600',
      textAlign: 'right',
    },
  }), [theme, fs]);

  useEffect(() => {
    loadSavedCitiesAndRefresh();
  }, [i18n.language]);

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
      // Sequential refresh: parallel TLS handshakes through a VPN often
      // fail with SSLHandshakeException, so go one city at a time.
      const updatedList = [];
      for (const city of list) {
        try {
          // Prefer stored coordinates: they are language-independent, so a
          // rename works even if the old name is in another language.
          let lat = city.latitude;
          let lon = city.longitude;
          let resolvedName = city.name;
          if (lat === undefined || lon === undefined) {
            // Current language -> English -> transliterated variants.
            const hit = await geocodeCity(city.name, currentLang, fetchJson);
            if (hit) {
              lat = hit.latitude;
              lon = hit.longitude;
              resolvedName = hit.name || city.name;
            }
          } else {
            const localized = await resolveCityName(lat, lon, currentLang);
            if (localized) resolvedName = localized;
          }

          if (lat !== undefined && lon !== undefined) {
            const weatherData = await fetchJson(
              `${BASE_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
            );
            if (weatherData && weatherData.current_weather) {
              const temp = Math.round(weatherData.current_weather.temperature);
              const min = weatherData.daily?.temperature_2m_min ? Math.round(weatherData.daily.temperature_2m_min[0]) : '';
              const max = weatherData.daily?.temperature_2m_max ? Math.round(weatherData.daily.temperature_2m_max[0]) : '';
              const code = weatherData.current_weather.weathercode;
              const isNight = weatherData.current_weather.is_day === 0;

              updatedList.push({
                ...city,
                latitude: lat,
                longitude: lon,
                name: resolvedName,
                temp: `${temp}`,
                minMax: min !== '' && max !== '' ? `${max}° / ${min}°` : '',
                condition: getWeatherConditionText(code),
                weathercode: code,
                isNight,
              });
              continue;
            }
          }
        } catch (e) {
          console.warn(`Failed to refresh city ${city.name}:`, e?.message || e);
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

  const handleDeleteCity = (id, name) => {
    Alert.alert(
      t('cities.delete_title'),
      t('cities.delete_message', { name }),
      [
        { text: t('cities.cancel'), style: 'cancel' },
        {
          text: t('cities.delete'),
          style: 'destructive',
          onPress: async () => {
            const updated = cities.filter(c => c.id !== id);
            setCities(updated);
            await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const handleSelectCity = async (cityName) => {
    try {
      await AsyncStorage.setItem(LAST_SELECTED_CITY_KEY, cityName);
      navigation.navigate('Tabs', { screen: 'weather', params: { selectedCity: cityName } });
    } catch (e) {
      navigation.navigate('Tabs', { screen: 'weather' });
    }
  };

  const renderItem = ({ item }) => {
    const isLight = theme.mode === 'light';
    // Night cards are always dark -> use white text even in light theme
    const darkCard = !!item.isNight;
    const useDarkText = isLight && !darkCard;
    const mainText = useDarkText ? '#1e293b' : '#FFFFFF';
    const subText = useDarkText ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.8)';
    const minMaxText = useDarkText ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    const cardColor = item.weathercode !== undefined
      ? getWeatherCardColor(item.weathercode, item.isNight)
      : (isLight ? '#b9c9d8' : '#4a6b8a');
    const weatherIcon = item.weathercode !== undefined
      ? getWeatherIcon(item.weathercode, item.isNight)
      : 'cloudy';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.cardContainer,
          isLight && styles.cardContainerLight,
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        onPress={() => handleSelectCity(item.name)}
        onLongPress={() => handleDeleteCity(item.id, item.name)}
      >
        <View
          style={[styles.cardGradient, { backgroundColor: cardColor }]}
        >
          <View style={styles.cardBody}>
            <View style={styles.cardLeft}>
              <Text
                style={[styles.cityName, { color: mainText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {item.name}
              </Text>
              <View style={styles.conditionRow}>
                <Ionicons name={weatherIcon} size={15} color={useDarkText ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'} />
                <Text style={[styles.cityCondition, { color: subText }]} numberOfLines={1} ellipsizeMode="tail">
                  {item.condition || t('condition.cloudy')}
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.tempRow}>
                <Text style={[styles.cityTemp, { color: mainText }]}>{item.temp || '0'}</Text>
                <Text style={[styles.tempDegree, { color: mainText }]}>°</Text>
              </View>
              <Text style={[styles.cityMinMax, { color: minMaxText }]}>{item.minMax || ''}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceRaised }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t('cities.title')}
        </Text>
      </View>

      {/* Search / Add Bar */}
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

      {isLoading && cities.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.tint || '#3a7bd5'} />
        </View>
      ) : (
        <FlatList
          data={cities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSavedCitiesAndRefresh(); }} />
          }
        />
      )}
    </ScreenWrapper>
  );
}
