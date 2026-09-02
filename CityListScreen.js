import React, { useState, useEffect } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';

const SAVED_CITIES_KEY = 'saved_cities_list';
const LAST_SELECTED_CITY_KEY = 'last_selected_city';
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

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
      const updatedList = await Promise.all(
        list.map(async (city) => {
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.name)}&count=1&language=${currentLang}&format=json`
            );
            const geoData = await geoRes.json();
            let lat, lon, resolvedName = city.name;
            if (geoData.results && geoData.results.length > 0) {
              lat = geoData.results[0].latitude;
              lon = geoData.results[0].longitude;
              resolvedName = geoData.results[0].name || city.name;
            } else {
              const fallbackGeoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.name)}&count=1&format=json`
              );
              const fallbackGeoData = await fallbackGeoRes.json();
              if (fallbackGeoData.results && fallbackGeoData.results.length > 0) {
                lat = fallbackGeoData.results[0].latitude;
                lon = fallbackGeoData.results[0].longitude;
                resolvedName = fallbackGeoData.results[0].name || city.name;
              }
            }

            if (lat !== undefined && lon !== undefined) {
              const weatherRes = await fetch(
                `${BASE_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
              );
              const weatherData = await weatherRes.json();
              if (weatherData && weatherData.current_weather) {
                const temp = Math.round(weatherData.current_weather.temperature);
                const min = weatherData.daily?.temperature_2m_min ? Math.round(weatherData.daily.temperature_2m_min[0]) : '';
                const max = weatherData.daily?.temperature_2m_max ? Math.round(weatherData.daily.temperature_2m_max[0]) : '';
                const code = weatherData.current_weather.weathercode;
                const isNight = weatherData.current_weather.is_day === 0;
                
                return {
                  ...city,
                  name: resolvedName,
                  temp: `${temp}`,
                  minMax: min !== '' && max !== '' ? `${max}° / ${min}°` : '',
                  condition: getWeatherConditionText(code),
                  gradientColors: getGlassGradient(code, isNight),
                };
              }
            }
          } catch (e) {
            console.error(`Failed to refresh city ${city.name}:`, e);
          }
          return city;
        })
      );

      setCities(updatedList);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getGlassGradient = (code, isNight) => {
    const isLight = theme.mode === 'light';
    if (isNight) {
      return ['rgba(15, 25, 45, 0.7)', 'rgba(30, 45, 75, 0.5)'];
    }
    if (code === 0) {
      return isLight ? ['rgba(41, 128, 185, 0.35)', 'rgba(109, 213, 250, 0.2)']: ['rgba(41, 128, 185, 0.6)', 'rgba(109, 213, 250, 0.4)'];
    }
    if (code <= 3) {
      return isLight ? ['rgba(76, 161, 175, 0.35)', 'rgba(44, 62, 80, 0.3)'] : ['rgba(76, 161, 175, 0.6)', 'rgba(44, 62, 80, 0.5)'];
    }
    if (code <= 67) {
      return isLight ? ['rgba(58, 123, 213, 0.35)', 'rgba(58, 96, 115, 0.3)'] : ['rgba(58, 123, 213, 0.6)', 'rgba(58, 96, 115, 0.5)'];
    }
    if (code <= 77) {
      return isLight ? ['rgba(101, 121, 155, 0.35)', 'rgba(94, 37, 99, 0.3)'] : ['rgba(101, 121, 155, 0.6)', 'rgba(94, 37, 99, 0.5)'];
    }
    return isLight ? ['rgba(35, 37, 38, 0.4)', 'rgba(65, 67, 69, 0.3)'] : ['rgba(35, 37, 38, 0.7)', 'rgba(65, 67, 69, 0.5)'];
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
      let geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=${currentLang}&format=json`
      );
      let geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&format=json`
        );
        geoData = await geoRes.json();
      }

      if (!geoData.results || geoData.results.length === 0) {
        Alert.alert(t('cities.error'), t('cities.city_not_found'));
        setIsLoading(false);
        return;
      }
      const { latitude, longitude, name } = geoData.results[0];
      const weatherRes = await fetch(
        `${BASE_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const temp = weatherData?.current_weather ? Math.round(weatherData.current_weather.temperature) : 0;
      const min = weatherData?.daily?.temperature_2m_min ? Math.round(weatherData.daily.temperature_2m_min[0]) : '';
      const max = weatherData?.daily?.temperature_2m_max ? Math.round(weatherData.daily.temperature_2m_max[0]) : '';
      const code = weatherData?.current_weather?.weathercode || 0;
      const isNight = weatherData?.current_weather?.is_day === 0;

      const newCity = {
        id: Date.now().toString(),
        name: name || cityName,
        temp: `${temp}`,
        minMax: min !== '' && max !== '' ? `${max}° / ${min}°` : '',
        condition: getWeatherConditionText(code),
        gradientColors: getGlassGradient(code, isNight),
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

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
      onPress={() => handleSelectCity(item.name)}
      onLongPress={() => handleDeleteCity(item.id, item.name)}
    >
      <LinearGradient
        colors={item.gradientColors || ['rgba(41, 128, 185, 0.5)', 'rgba(109, 213, 250, 0.3)']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.cardContentInner, { backgroundColor: theme.mode === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)' }]}>
          <View style={styles.cardLeft}>
            <Text style={[styles.cityName, theme.mode === 'light' && { color: '#1a1a1a' }]} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            <Text style={[styles.cityCondition, theme.mode === 'light' && { color: 'rgba(26, 26, 26, 0.75)' }]} numberOfLines={1} ellipsizeMode="tail">
              {item.condition || t('condition.cloudy')}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.tempRow}>
              <Text style={[styles.cityTemp, theme.mode === 'light' && { color: '#1a1a1a' }]}>{item.temp || '0'}</Text>
              <Text style={[styles.tempDegree, theme.mode === 'light' && { color: '#1a1a1a' }]}>°</Text>
            </View>
            <Text style={[styles.cityMinMax, theme.mode === 'light' && { color: 'rgba(26, 26, 26, 0.7)' }]}>{item.minMax || ''}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceRaised }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('cities.title')}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 24,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    padding: 10,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardContentInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 90,
    borderRadius: 20,
  },
  cardLeft: {
    flex: 0.65,
    justifyContent: 'center',
    paddingRight: 8,
  },
  cardRight: {
    flex: 0.35,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  cityCondition: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cityTemp: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 52,
  },
  tempDegree: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -4,
    marginLeft: 1,
  },
  cityMinMax: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'right',
  },
});
