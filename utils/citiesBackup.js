// Export / import of the saved-cities list as a JSON file in the app's own
// storage: <app storage>/MyWeatherApp/cities
// (Android: /data/user/0/<package>/files/MyWeatherApp/cities in Expo Go /
// dev builds; see utils/appStorage.js — no SAF, no permission prompt,
// auto-created, MIUI-immune).
//
// Format: { app: 'MyWeather', version: 1, exportedAt: ISO,
//           cities: [{ name, latitude?, longitude? }] }
// Coordinates are optional: the refresh pipeline refills missing ones
// via search (legacy lookup), same as the seed trio.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getAppStorageRoot, ensureDir } from './appStorage';

// Must match the key in CityListScreen.js. Kept duplicated (not imported)
// to avoid a CityListScreen <-> citiesBackup import cycle.
const SAVED_CITIES_KEY = 'saved_cities_list';
// Set on import; CityListScreen consumes it on focus and clears it.
export const CITIES_CHANGED_KEY = 'cities_changed_flag';

export const BACKUP_FILE_PREFIX = 'MyWeather-cities-';
const MAX_CITIES = 200;

export function getBackupDir() {
  const root = getAppStorageRoot();
  return root ? `${root}cities/` : null;
}

async function ensureBackupDir() {
  const dir = getBackupDir();
  if (!dir) throw new Error('no app storage base');
  return ensureDir(dir);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function exportCities() {
  const raw = await AsyncStorage.getItem(SAVED_CITIES_KEY);
  let stored = [];
  try {
    stored = raw ? JSON.parse(raw) : [];
  } catch (e) {
    stored = [];
  }
  const cities = (Array.isArray(stored) ? stored : [])
    .map((c) => {
      const o = { name: String(c?.name || '').trim().slice(0, 100) };
      if (Number.isFinite(c?.latitude) && Number.isFinite(c?.longitude)) {
        o.latitude = c.latitude;
        o.longitude = c.longitude;
      }
      return o;
    })
    .filter((c) => c.name);
  const dir = await ensureBackupDir();
  const payload = JSON.stringify({
    app: 'MyWeather',
    version: 1,
    exportedAt: new Date().toISOString(),
    cities,
  });
  const fileName = `${BACKUP_FILE_PREFIX}${stamp()}.json`;
  await FileSystem.writeAsStringAsync(`${dir}${fileName}`, payload);
  return { count: cities.length, name: fileName };
}

export async function listBackupFiles() {
  try {
    const dir = getBackupDir();
    if (!dir) return [];
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return [];
    const names = await FileSystem.readDirectoryAsync(dir);
    const out = [];
    for (const name of names) {
      if (!name.startsWith(BACKUP_FILE_PREFIX)) continue;
      try {
        const info = await FileSystem.getInfoAsync(`${dir}${name}`);
        out.push({ name, path: `${dir}${name}`, size: info.size ?? 0, mtime: info.modificationTime ?? 0 });
      } catch (e) {
        out.push({ name, path: `${dir}${name}`, size: 0, mtime: 0 });
      }
    }
    out.sort((a, b) => (a.name < b.name ? 1 : -1));
    return out;
  } catch (e) {
    return [];
  }
}

export async function deleteBackupFile(path) {
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function importCitiesFromUri(uri) {
  const text = await FileSystem.readAsStringAsync(uri);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('bad-file');
  }
  // Accept both { cities: [...] } and a bare [...] array.
  const arr = Array.isArray(parsed) ? parsed : parsed?.cities;
  if (!Array.isArray(arr)) throw new Error('bad-file');
  const cities = [];
  for (const c of arr) {
    if (cities.length >= MAX_CITIES) break;
    const name = String(c?.name || '').trim().slice(0, 100);
    if (!name) continue;
    const o = { id: `${Date.now().toString(36)}-${cities.length}`, name };
    const lat = Number(c?.latitude);
    const lon = Number(c?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      o.latitude = lat;
      o.longitude = lon;
    }
    cities.push(o);
  }
  if (cities.length === 0) throw new Error('bad-file');
  await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(cities));
  await AsyncStorage.setItem(CITIES_CHANGED_KEY, '1');
  return { count: cities.length, skipped: arr.length - cities.length };
}
