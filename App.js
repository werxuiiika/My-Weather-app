import React, { createContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WeatherApp from './WeatherApp';
import WeatherPhenomenonFinder, { SunTabIcon, SearchTabIcon } from './WeatherPhenomenonFinder';

export const LoadingContext = createContext({ isLoading: true, setLoading: () => {} });

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Погода') {
                return <SunTabIcon color={color} size={size} />;
              }
              return <SearchTabIcon color={color} size={size} />;
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
          <Tab.Screen name="Погода" component={WeatherApp} />
          <Tab.Screen name="Явления" component={WeatherPhenomenonFinder} />
        </Tab.Navigator>
      </NavigationContainer>
    </LoadingContext.Provider>
  );
}
