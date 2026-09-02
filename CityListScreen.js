import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  SafeAreaStorage,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useFontSize } from './FontSizeContext';
import { useTranslation } from 'react-i18next';

const SAVED_CITIES_KEY = 'saved_cities_list';
const LAST_SELECTED_CITY_KEY = 'last_selected_city';

export default function CityListScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const fs = useFontSize();
  const { t } = useTranslation();

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocationWeather, setCurrentLocationWeather] = useState(null);

  useEffect(() => {
    loadSavedCities();
  }, []);

  const loadSavedCities = async () => {
    try {
      const data = await AsyncStorage.getItem(SAVED_CITIES_KEY);
      if (data) {
        setCities(JSON.parse(data));
      } else {
        // Default cities if empty
        const defaultCities = [
          { id: '1', name: 'Москва', temp: '-2°', minMax: '2° / -5°', condition: 'Пасмурно', gradient: ['#2c3e50', '#3498db'] },
          { id: '2', name: 'Санкт-Петербург', temp: '0°', minMax: '3° / -2°', condition: 'Облачно', gradient: ['#4ca1af', '#2c3e50'] },
          { id: '3', name: 'Сочи', temp: '+14°', minMax: '16° / 10°', condition: 'Ясно', gradient: ['#2980b9', '#6dd5fa'] },
        ];
        setCities(defaultCities);
        await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(defaultCities));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveCitiesToStorage = async (newCities) => {
    try {
      setCities(newCities);
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newCities));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCity = async () => {
    if (!searchQuery.trim()) return;
    const newCity = {
      id: Date.now().toString(),
      name: searchQuery.trim(),
      temp: '+10°',
      minMax: '12° / 6°',
      condition: 'Переменная облачность',
      gradient: ['#3a7bd5', '#3a6073'],
    };
    const updated = [...cities, newCity];
    await saveCitiesToStorage(updated);
    setSearchQuery('');
  };

  const handleDeleteCity = (id, name) => {
    Alert.alert(
      'Удаление города',
      `Удалить ${name} из списка сохраненных?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const updated = cities.filter(c => c.id !== id);
            await saveCitiesToStorage(updated);
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
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.cardContainer}
      onPress={() => handleSelectCity(item.name)}
      onLongPress={() => handleDeleteCity(item.id, item.name)}
    >
      <LinearGradient
        colors={item.gradient || ['#2b5876', '#4e4376']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cityName}>{item.name}</Text>
          <Text style={styles.cityCondition}>{item.condition}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cityTemp}>{item.temp}</Text>
          <Text style={styles.cityMinMax}>{item.minMax}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surfaceRaised }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Управление городами</Text>
      </View>

      {/* Search / Add Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surfaceRaised, color: theme.text, borderColor: theme.border }]}
          placeholder="Добавить город..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleAddCity}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.tint || '#3a7bd5' }]} onPress={handleAddCity}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* City List */}
      <FlatList
        data={cities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    borderRadius: 12,
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
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    minHeight: 100,
  },
  cardLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cityCondition: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  cityTemp: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  cityMinMax: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});
