import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ru from './locales/ru.json';

const LANGUAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['ru', 'en'];

export const initI18n = async () => {
  let lang = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (!lang || !SUPPORTED_LANGUAGES.includes(lang)) {
    const locales = Localization.getLocales();
    const deviceLang = locales[0]?.languageCode || 'en';
    lang = deviceLang === 'ru' ? 'ru' : 'en';
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
};

export const changeLanguage = async (lang) => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export default i18n;
