// Expo config plugin: paint the Android window background navy.
//
// Why: AppTheme inherits Theme.AppCompat.DayNight.NoActionBar with NO
// android:windowBackground item, so in dark mode the OS window is grey.
// During a native-stack push, any pixel neither screen has painted yet
// (trailing edge of slide_from_right) shows that grey as a "flash".
// Setting the window background to the app background (#1c2333, the
// default/author theme) makes such gaps invisible by construction —
// regardless of which screen is entering.
//
// Safe for the launch splash: it uses the separate
// Theme.App.SplashScreen (own splash background/drawable); AppTheme only
// applies post-splash via postSplashScreenTheme.
// android/ is gitignored + regenerated with --clean, hence a plugin.
const { withAndroidStyles } = require('@expo/config-plugins');

const NAVY = '#ff1c2333';

module.exports = function withAndroidWindowBackground(config) {
  return withAndroidStyles(config, (config) => {
    const styles = (config.modResults.resources && config.modResults.resources.style) || [];
    const appTheme = styles.find((s) => s && s.$ && s.$.name === 'AppTheme');
    if (!appTheme) return config;
    const items = appTheme.item || [];
    const at = items.findIndex((it) => it && it.$ && it.$.name === 'android:windowBackground');
    const entry = { $: { name: 'android:windowBackground' }, _: NAVY };
    if (at >= 0) items[at] = entry;
    else items.push(entry);
    appTheme.item = items;
    return config;
  });
};
