# 🌤️ My Weather App — Моя погода

[![Build APK](https://github.com/werxuiiika/My-Weather-app/actions/workflows/android-build.yml/badge.svg)](https://github.com/werxuiiika/My-Weather-app/actions)

Лёгкое адаптивное приложение погоды для Android на **React Native (Expo SDK 57)**.
Особенность проекта: весь цикл — от кода до релизного APK — делается **с мобильного устройства** (Termux + OpenCode).

## ✨ Ключевые особенности

- 🔍 **Умный мультиязычный поиск**: запрос идёт на языке приложения → fallback на английский → транслитерация кириллицы в латиницу. Находит даже мелкие города вроде Fitzgerald по запросу «Фицджералд».
- 📍 **Честная геолокация**: корректная обработка разрешений Android 12+, кастомный диалог с кнопкой «Открыть настройки», поддержка точной и приблизительной геолокации.
- 🎨 **Адаптивность**: масштабирование шрифтов, светлая/тёмная/авторская темы, SafeArea.
- 🌍 **Локализация**: RU/EN через i18next с переключением на лету.
- 🌫️ **Раздел «Явления»**: поиск городов из встроенной базы по погодному явлению (снег, туман, гроза…).
- 🤖 **CI/CD**: GitHub Actions собирает release-APK при каждом пуше в main.

## 🛠️ Стек

React Native · Expo SDK 57 · JavaScript (ES6+) · Yarn Classic · Open-Meteo API (без ключей) · i18next · React Navigation · GitHub Actions

## 🚀 Запуск

```bash
git clone https://github.com/werxuiiika/My-Weather-app.git
cd My-Weather-app
yarn install
npx expo start --clear
```

APK: вкладка Actions → последний успешный ран → артефакт `app-release.apk`.

## 📂 Структура

```text
├── App.js / WeatherApp.js       # точка входа, главный экран
├── CityListScreen.js            # управление городами
├── WeatherPhenomenonFinder.js   # раздел «Явления»
├── SettingsScreen.js            # настройки
├── ThemeContext / FontSizeContext / LoadingContext / SettingsContext
├── locales/ (ru.json, en.json)  # переводы
├── geocoding.js                 # поиск с fallback и транслитерацией
├── assets/                      # иконки, splash
└── .github/workflows/           # CI/CD
```

## 🤝 Вклад

Нашли баг или есть идея — создавайте Issue или Pull Request.

## 📄 Лицензия

MIT, подробнее в файле [LICENSE](LICENSE).

---
Made with ❤️ by **werxuiiika**
