// Expo config plugin: localize the app name by DEVICE language.
//
// Why not expo-localization in app.config.js: the config is evaluated once
// at prebuild time on the BUILD machine (GitHub Actions = English locale),
// so the name would be baked as English for everyone. Instead this plugin
// adds an Android resource qualifier (res/values-en/strings.xml) — the OS
// then picks "My Weather" on English devices and the default name
// ("Моя погода") everywhere else, at runtime, with zero JS involved.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withLocalizedAppName(config, props = {}) {
  const englishName = props.englishName || 'My Weather';
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res'
      );
      const enDir = path.join(resDir, 'values-en');
      await fs.promises.mkdir(enDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(enDir, 'strings.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="app_name">${englishName}</string>\n</resources>\n`
      );
      return config;
    },
  ]);
};
