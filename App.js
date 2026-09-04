import React, { createContext, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, Animated, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import WeatherApp from './WeatherApp';
import WeatherPhenomenonFinder, { SunTabIcon, SearchTabIcon } from './WeatherPhenomenonFinder';
import SettingsScreen from './SettingsScreen';
import CityListScreen from './CityListScreen';
import { SettingsProvider } from './SettingsContext';
import { FontSizeProvider, useFontSize } from './FontSizeContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { LoadingContext } from './LoadingContext';
import { initI18n } from './i18n';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppContent() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  if (!isI18nReady) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return <AppMain />;
}

function AppMain() {
  const { t } = useTranslation();
  const { loaded, themeOverlayOpacity } = useTheme();

  return (
    <LoadingContext.Provider value={{ isLoading: false, setLoading: () => {} }}>
      <Animated.View style={{ flex: 1, opacity: themeOverlayOpacity }}>
        <FontSizeProvider>
          <SettingsProvider>
            <SafeAreaProvider style={{ flex: 1 }}>
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
                  <Stack.Screen
                    name="CityList"
                    component={CityListScreen}
                    options={{ animation: 'slide_from_right' }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
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
          height: 50,
          paddingBottom: 0,
          paddingTop: 0,
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
        height: 50,
        paddingBottom: 0,
        paddingTop: 0,
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
              <IconComponent color={iconColor} size={iconSize * 0.8} />
            </Animated.View>
            <Text
              style={{
                fontSize: base * 0.6875,
                fontWeight: '600',
                color: iconColor,
                marginTop: 0,
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
