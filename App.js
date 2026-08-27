import React, { createContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import WeatherApp from './WeatherApp';
import WeatherPhenomenonFinder, { SunTabIcon, SearchTabIcon } from './WeatherPhenomenonFinder';
import { SettingsProvider } from './SettingsContext';
import { initI18n } from './i18n';

export const LoadingContext = createContext({ isLoading: true, setLoading: () => {} });

const Tab = createBottomTabNavigator();

export default function App() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  if (!isI18nReady) {
    return null;
  }

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: () => {} }}>
      <SettingsProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ color, size }) => {
                if (route.name === 'weather') {
                  return <SunTabIcon color={color} size={size} />;
                }
                return <SearchTabIcon color={color} size={size} />;
              },
              tabBarLabel: ({ focused }) => {
                const label = route.name === 'weather' ? t('weather') : t('phenomena');
                return (
                  <Text style={{ fontSize: 14, fontWeight: '600', paddingBottom: 4, color: focused ? '#fbbf24' : '#94a3b8' }}>
                    {label}
                  </Text>
                );
              },
              tabBarActiveTintColor: '#fbbf24',
              tabBarInactiveTintColor: '#94a3b8',
              tabBarLabelStyle: {
                fontSize: 14,
                fontWeight: '600',
                paddingBottom: 4,
              },
              tabBarStyle: {
                backgroundColor: '#0f172a',
                borderTopColor: '#1e293b',
                height: 70,
                paddingBottom: 8,
                display: isLoading ? 'none' : 'flex',
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="weather" component={WeatherApp} />
            <Tab.Screen name="phenomena" component={WeatherPhenomenonFinder} />
          </Tab.Navigator>
        </NavigationContainer>
      </SettingsProvider>
    </LoadingContext.Provider>
  );
}
