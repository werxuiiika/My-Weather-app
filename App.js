import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WeatherApp from './WeatherApp';
import WeatherPhenomenonFinder, { SunTabIcon, SearchTabIcon } from './WeatherPhenomenonFinder';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
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
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Погода" component={WeatherApp} />
        <Tab.Screen name="Явления" component={WeatherPhenomenonFinder} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
