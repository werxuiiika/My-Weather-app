import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';

const CITIES = [
  { name: 'Москва', latitude: 55.7558, longitude: 37.6173 },
  { name: 'Лондон', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Нью-Йорк', latitude: 40.7128, longitude: -74.006 },
  { name: 'Токио', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Сочи', latitude: 43.5974, longitude: 39.7154 },
  { name: 'Мумбаи', latitude: 19.076, longitude: 72.8777 },
  { name: 'Пекен', latitude: 39.9042, longitude: 116.4074 },
  { name: 'Санкт-Петербург', latitude: 59.9343, longitude: 30.3351 },
  { name: 'Новосибирск', latitude: 55.0302, longitude: 82.9784 },
  { name: 'Екатеринбург', latitude: 56.8389, longitude: 60.6159 },
  { name: 'Норильск', latitude: 69.35, longitude: 88.2 },
  { name: 'Мурманск', latitude: 68.97, longitude: 33.08 },
  { name: 'Рейкьявик', latitude: 64.15, longitude: -21.94 },
  { name: 'Красноярск', latitude: 56.0153, longitude: 92.8567 },
  { name: 'Сеул', latitude: 37.5665, longitude: 126.978 },
  { name: 'Берлин', latitude: 52.52, longitude: 13.405 },
  { name: 'Париж', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Майами', latitude: 25.7617, longitude: -80.1918 },
  { name: 'Лос-Анджелес', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Дубай', latitude: 25.2048, longitude: 55.2708 },
  { name: 'Сингапур', latitude: 1.3521, longitude: 103.8198 },
  { name: 'Сидней', latitude: -33.8688, longitude: 151.2093 },
];

const PHENOMENA_BUTTONS = ['Ясно', 'Дождь', 'Снег', 'Облачно', 'Туман'];

function isCodeInPhenomenon(code, phenomenon) {
  switch (phenomenon) {
    case 'Гроза':
      return code === 95 || code === 96 || code === 99;
    case 'Ясно':
      return code === 0;
    case 'Дождь':
      return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    case 'Снег':
      return (code >= 71 && code <= 77) || code === 85 || code === 86;
    case 'Туман':
      return code === 45 || code === 48;
    case 'Облачно':
      return code === 1 || code === 2 || code === 3;
    default:
      return false;
  }
}

function SunTabIcon({ color = '#fbbf24', size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function SearchTabIcon({ color = '#fbbf24', size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10" cy="10" r="6" stroke={color} strokeWidth="2" />
      <Path d="M15 15l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function WeatherPhenomenonFinder() {
  const navigation = useNavigation();
  const [selectedPhenomenon, setSelectedPhenomenon] = useState('Ясно');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const fetchPromises = CITIES.map(async (city) => {
        try {
          const url =
            'https://api.open-meteo.com/v1/forecast?latitude=' +
            city.latitude +
            '&longitude=' +
            city.longitude +
            '&current_weather=true';
          const res = await fetch(url);
          const data = await res.json();
          if (!data.current_weather) {
            return { ...city, temperature: null, weathercode: null };
          }
          return {
            ...city,
            temperature: Math.round(data.current_weather.temperature),
            weathercode: data.current_weather.weathercode,
          };
        } catch (e) {
          return { ...city, temperature: null, weathercode: null };
        }
      });
      const allResults = await Promise.all(fetchPromises);
      const matched = allResults
        .filter(
          (r) =>
            r.weathercode !== null &&
            isCodeInPhenomenon(r.weathercode, selectedPhenomenon)
        )
        .slice(0, 5);
      setResults(matched);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (label) => {
    setSelectedPhenomenon(label);
    handleSearch();
  };

  const renderButton = (label) => {
    const isActive = selectedPhenomenon === label;
    return (
      <TouchableOpacity
        key={label}
        style={[styles.phenomenonButton, isActive && styles.phenomenonButtonActive]}
        onPress={() => handlePress(label)}
        activeOpacity={0.7}
      >
        <Text style={[styles.phenomenonButtonText, isActive && styles.phenomenonButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('Погода', { city: item.name })}
      activeOpacity={0.7}
    >
      <Text style={styles.resultCity}>{item.name}</Text>
      <Text style={styles.resultTemp}>{item.temperature}°</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>Поиск погоды по явлениям</Text>
      <View style={styles.buttonContainer}>
        {PHENOMENA_BUTTONS.map((label) => renderButton(label))}
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text style={styles.loadingText}>Опрос погоды в 20 городах…</Text>
        </View>
      )}
      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.name + '-' + item.weathercode}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
      {!loading && results.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>Нажмите кнопку для поиска погоды в 20 городах</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  phenomenonButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  phenomenonButtonActive: {
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  phenomenonButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  phenomenonButtonTextActive: {
    color: '#fbbf24',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 14,
  },
  listContent: {
    gap: 12,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  resultCity: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultTemp: {
    color: '#fbbf24',
    fontSize: 22,
    fontWeight: '500',
  },
  hintContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export { SunTabIcon, SearchTabIcon };
