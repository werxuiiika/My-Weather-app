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
- 🏙️ **Управление городами**: drag-and-drop с физикой в духе Xiaomi (overlap-and-swap по 75%, пружин нет — строгий ease-in-out), отдельная закреплённая карточка геолокации, мультивыбор с «Выбрать все», опциональное подтверждение удаления.
- ☀️ **Живые иконки**: солнце вращается в почасовом и недельном прогнозе, а не только на главном экране.
- 🧰 **Crash reporting**: непойманные ошибки пишутся в `Download/WeatherLogs`, в приложении есть просмотрщик и экспорт логов (вход — 7 тапов по версии в «О приложении»).
- 🤖 **CI/CD**: GitHub Actions собирает release-APK при каждом пуше в main и публикует GitHub Release по тэгу `v*`.

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
├── DraggableCityCard.js         # карточка города с drag-and-drop
├── CurrentLocationCard.js       # закреплённая карточка геолокации
├── ConfirmDeleteModal.js        # компактный диалог удаления
├── WeatherPhenomenonFinder.js   # раздел «Явления»
├── SettingsScreen.js            # настройки
├── components/                  # GlobalErrorBoundary, CrashLogViewer
├── utils/                       # crashLogger, dragTrace, plural
├── ThemeContext / FontSizeContext / LoadingContext / SettingsContext
├── locales/ (ru.json, en.json)  # переводы
├── geocoding.js                 # поиск с fallback и транслитерацией
├── assets/                      # иконки, splash
└── .github/workflows/           # CI/CD
```

## 📦 История версий

### 1.0.20 — «Управление городами»
- Drag-and-drop городов: overlap-and-swap по 75% перекрытия, подъём карточки с тенью, тихий дроп без пружин и двойных анимаций
- Отдельная неперетаскиваемая карточка текущего местоположения (пины, тап → погода)
- Мультивыбор: «Выбрать все»/«Снять выбор», блокировка pull-to-refresh в режиме выбора
- Подтверждение удаления с переключателем в настройках; правильное склонение («7 объектов»)
- Компактный диалог удаления (адаптивная плотность 1 ↔ N) и настройки во всю ширину
- Вращающееся солнце в почасовом/недельном прогнозе
- Собственный crash reporting + телеметрия драга, экспорт логов в `Download/WeatherLogs`
- Секретное dev-меню логов: 7 тапов по версии в «О приложении»

## 🤝 Вклад

Нашли баг или есть идея — создавайте Issue или Pull Request.

## 📄 Лицензия

MIT, подробнее в файле [LICENSE](LICENSE).

---
Made with ❤️ by **werxuiiika**
