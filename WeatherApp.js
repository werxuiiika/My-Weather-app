import { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10000;
const NETWORK_ERROR =
  'Нет подключения к интернету. Проверьте настройки сети.';
const TIMEOUT_ERROR =
  'Сервер не отвечает. Проверьте подключение или отключите VPN.';
const VPN_WARNING =
  'VPN может блокировать подключение. Попробуйте отключить его.';

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } catch (e) {
    if (e instanceof TypeError || (e && e.name === 'AbortError')) {
      const err = new Error(
        e instanceof TypeError ? NETWORK_ERROR : TIMEOUT_ERROR
      );
      err.kind = 'network';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

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
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [hostUnreachable, setHostUnreachable] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [dismissedMsg, setDismissedMsg] = useState(null);
  const [cityTime, setCityTime] = useState(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [splashRendered, setSplashRendered] = useState(true);

  const lastRequest = useRef(null);

  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const sunRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(sunRotate, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sunScale, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sunScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
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
    if (!isSplashVisible) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSplashRendered(false);
      });
    }
  }, [isSplashVisible]);

  useEffect(() => {
    if (isContentVisible) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isContentVisible]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const state = await NetInfo.fetch();
      if (!active) return;
      updateConnection(!!state.isConnected);
      detectMyLocation();
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

  const geocode = async (query) => {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=ru&format=json`
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

  const loadByCoords = async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      const [place, data] = await Promise.all([
        reverseGeocode(lat, lon),
        fetchWeather(lat, lon),
      ]);
      setWeather({ place, data });
      lastRequest.current = { type: 'coords', lat, lon };
    } catch (e) {
      if (isConnectedRef.current === false) {
        setError(NETWORK_ERROR);
      } else if (e.kind === 'network') {
        setError(null);
        setHostUnreachable(true);
      } else {
        setError(e.message || 'Не удалось получить погоду');
      }
      setWeather(null);
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

  const doSearch = async (query) => {
    setLoading(true);
    setError(null);
    try {
      const place = await geocode(query);
      const data = await fetchWeather(place.latitude, place.longitude);
      setWeather({ place, data });
      lastRequest.current = { type: 'city', query };
    } catch (e) {
      if (isConnectedRef.current === false) {
        setError(NETWORK_ERROR);
      } else if (e.kind === 'network') {
        setError(null);
        setHostUnreachable(true);
      } else {
        setError(e.message || 'Не удалось получить погоду');
      }
      setWeather(null);
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

  const iconFor = (code, night = false) => {
    if (code === 0) return night ? '🌙' : '☀️';
    if (code <= 3) return night ? '🌙☁️' : '🌤️';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 86) return '🌧️';
    return '⛈️';
  };

  const currentIsNight =
    weather &&
    weather.data &&
    weather.data.current_weather &&
    typeof weather.data.current_weather.is_day === 'number'
      ? weather.data.current_weather.is_day === 0
      : skyIsNight;

  const conditionFor = (code) => {
    if (code === 0) return 'Ясно';
    if (code <= 3) return 'Облачно';
    if (code <= 48) return 'Туман';
    if (code <= 67) return 'Дождь';
    if (code <= 77) return 'Снег';
    if (code <= 86) return 'Ливень';
    return 'Гроза';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
        <Text style={styles.title}>Погода</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Введите город"
            placeholderTextColor="#999"
            value={city}
            onChangeText={setCity}
            onSubmitEditing={search}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.button}
            onPress={search}
            activeOpacity={0.7}
          >
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
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={retryConnection}
              disabled={retrying}
            >
              <Text style={styles.bannerButtonText}>
                {retrying ? '…' : 'Повторить'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bannerClose}
              onPress={() => setDismissedMsg(bannerMessage)}
            >
              <Text style={styles.bannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {(loading || locating) && (
          <View style={styles.center}>
            <Animated.Text
              style={[
                styles.skyIcon,
                {
                  transform: [
                    { scale: sunScale },
                    { rotate: spinInterpolate },
                  ],
                },
              ]}
            >
              {skyIsNight ? '🌙' : '☀️'}
            </Animated.Text>
            <ActivityIndicator size="large" color="#4a90d9" />
            <Text style={styles.loadingText}>
              {locating ? 'Определение местоположения...' : 'Загрузка...'}
            </Text>
          </View>
        )}

        {weather && !loading && !locating && (
          <ScrollView
            style={styles.result}
            contentContainerStyle={styles.resultContent}
          >
            <Text style={styles.cityName}>{weather.place.name}</Text>
            <Text style={styles.subLabel}>
              {weather.place.country} · {weather.place.latitude.toFixed(2)},
              {weather.place.longitude.toFixed(2)}
            </Text>
            {cityTime && (
              <Text style={styles.cityTime}>Местное время: {cityTime}</Text>
            )}

            <Text style={styles.bigIcon}>
              {iconFor(
                weather.data.current_weather.weathercode,
                currentIsNight
              )}
            </Text>
            <Text style={styles.temperature}>
              {Math.round(weather.data.current_weather.temperature)}°
            </Text>
            <Text style={styles.condition}>
              {conditionFor(weather.data.current_weather.weathercode)}
            </Text>

            <View style={styles.detailRow}>
              <View style={styles.detailCard}>
                <Text style={styles.detailValue}>
                  {weather.data.current_weather.windspeed} км/ч
                </Text>
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
                <Text style={styles.forecastIcon}>
                  {iconFor(weather.data.daily.weathercode[i])}
                </Text>
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
          <Animated.Text
            style={[
              styles.splashIcon,
              {
                transform: [
                  { scale: sunScale },
                  { rotate: spinInterpolate },
                ],
              },
            ]}
          >
            {skyIsNight ? '🌙' : '☀️'}
          </Animated.Text>
          <Text style={styles.splashText}>Определяем погоду...</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function formatDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
}

function computeCityClock(data) {
  if (!data || typeof data.utc_offset_seconds !== 'number') return null;
  const now = new Date();
  const cityMs =
    now.getTime() +
    now.getTimezoneOffset() * 60000 +
    data.utc_offset_seconds * 1000;
  const d = new Date(cityMs);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1c2333',
  },
  splash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1c2333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    fontSize: 96,
    marginBottom: 24,
  },
  splashText: {
    color: '#cfe0ff',
    fontSize: 18,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#2a3248',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  button: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: '#4a90d9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locButton: {
    backgroundColor: '#38b06b',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  infoBannerVpn: {
    backgroundColor: '#ffe0b2',
  },
  infoBannerOffline: {
    backgroundColor: '#fdecea',
  },
  infoBannerTextOffline: {
    color: '#7a1c1c',
  },
  infoBannerText: {
    flex: 1,
    color: '#4a3000',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  bannerButton: {
    backgroundColor: '#4a3000',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  bannerButtonText: {
    color: '#fff3cd',
    fontSize: 13,
    fontWeight: '700',
  },
  bannerClose: {
    padding: 4,
  },
  bannerCloseText: {
    color: '#4a3000',
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  skyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    color: '#aab',
    marginTop: 10,
    fontSize: 16,
  },
  hint: {
    color: '#aab',
    fontSize: 16,
    textAlign: 'center',
  },
  result: {
    flex: 1,
  },
  resultContent: {
    paddingBottom: 30,
  },
  cityName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 13,
    color: '#aab',
    textAlign: 'center',
    marginTop: 2,
  },
  cityTime: {
    fontSize: 14,
    color: '#cfe0ff',
    textAlign: 'center',
    marginTop: 4,
  },
  bigIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginTop: 20,
  },
  temperature: {
    fontSize: 72,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
  },
  condition: {
    fontSize: 20,
    color: '#cfe0ff',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  detailCard: {
    backgroundColor: '#2a3248',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailLabel: {
    color: '#aab',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 10,
    marginBottom: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#202840',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  forecastDay: {
    color: '#cfe0ff',
    fontSize: 15,
    flex: 1,
  },
  forecastIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  forecastTemp: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
