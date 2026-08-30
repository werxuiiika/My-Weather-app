import React, { createContext, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, Animated, StatusBar, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import WeatherApp from './WeatherApp';
import WeatherPhenomenonFinder, { SunTabIcon, SearchTabIcon } from './WeatherPhenomenonFinder';
import SettingsScreen from './SettingsScreen';
import { SettingsProvider } from './SettingsContext';
import { FontSizeProvider, useFontSize } from './FontSizeContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { initI18n } from './i18n';

export const LoadingContext = createContext({ isLoading: true, setLoading: () => {} });

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppContent() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isI18nReady, setIsI18nReady] = useState(false);
  const { loaded, themeOverlayOpacity } = useTheme();

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  if (!isI18nReady || !loaded) {
    return null;
  }

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: () => {} }}>
      <Animated.View style={{ flex: 1, opacity: themeOverlayOpacity }}>
        <FontSizeProvider>
          <SettingsProvider>
            <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Tabs" component={TabScreens} />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SettingsProvider>
        </FontSizeProvider>
      </Animated.View>
    </LoadingContext.Provider>
  );
}

function TabScreens() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
         tabBarStyle: {
          height: 70 + (StatusBar.currentHeight || 0),
          paddingBottom: 8,
          paddingTop: StatusBar.currentHeight || 0,
        },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="weather" component={WeatherApp} />
      <Tab.Screen name="phenomena" component={WeatherPhenomenonFinder} />
    </Tab.Navigator>
  );
}

function AnimatedTabBar({ state, descriptors, navigation, style }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { base, iconSize } = useFontSize();
  const animationValues = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const focusedOptions = descriptors[state.routes[state.index].key]?.options ?? {};
  const displayStyle = StyleSheet.flatten(focusedOptions?.tabBarStyle ?? {})?.display ?? 'flex';

  useEffect(() => {
    state.routes.forEach((route, index) => {
      Animated.spring(animationValues[index], {
        toValue: index === state.index ? 1.15 : 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  if (displayStyle === 'none') {
    return <View style={{ height: 0, opacity: 0 }} />;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        borderTopWidth: 1,
        height: 70 + (StatusBar.currentHeight || 0),
        paddingBottom: 8,
        paddingTop: StatusBar.currentHeight || 0,
        ...style,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const IconComponent = route.name === 'weather' ? SunTabIcon : SearchTabIcon;
        const label = route.name === 'weather' ? t('weather') : t('phenomena');
        const iconColor = isFocused ? theme.accent : theme.textMuted;

        const onPress = () => {
          if (!isFocused) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: animationValues[index] }] }}>
              <IconComponent color={iconColor} size={iconSize} />
            </Animated.View>
            <Text
              style={{
                fontSize: base * 0.75,
                fontWeight: '600',
                color: iconColor,
                marginTop: 4,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
