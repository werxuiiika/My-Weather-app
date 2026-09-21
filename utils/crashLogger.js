import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { StorageAccessFramework } = FileSystem;

export const INTERNAL_LOG_FOLDER = 'logs';
export const DOWNLOAD_FOLDER = 'WeatherLogs';
const SAF_DIR_KEY = 'crash_logs_saf_dir_uri';

// ---------------------------------------------------------------------------
// Internal sandbox: /data/user/0/<package>/files/logs (always writable,
// readable only in-app on release builds).
// ---------------------------------------------------------------------------
export function getInternalLogDir() {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base.endsWith('/') ? base : `${base}/`}${INTERNAL_LOG_FOLDER}`;
}

async function writeInternal(timestamp, content) {
  const dir = getInternalLogDir();
  if (!dir) throw new Error('documentDirectory is null');
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const filePath = `${dir}/crash_${timestamp}.txt`;
  await FileSystem.writeAsStringAsync(filePath, content);
  return filePath;
}

export async function listInternalLogs() {
  try {
    const dir = getInternalLogDir();
    if (!dir) return [];
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return [];
    const names = await FileSystem.readDirectoryAsync(dir);
    const files = [];
    for (const name of names) {
      if (!name.endsWith('.txt') && !name.endsWith('.csv')) continue;
      try {
        const info = await FileSystem.getInfoAsync(`${dir}/${name}`);
        files.push({
          name,
          path: `${dir}/${name}`,
          size: info.size ?? 0,
          mtime: info.modificationTime ?? 0,
          location: 'internal',
        });
      } catch (e) {}
    }
    files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    return files;
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public Download/WeatherLogs via Storage Access Framework.
// /sdcard/Download/WeatherLogs — readable via `adb pull` without root.
// ---------------------------------------------------------------------------
export async function getSafDirUri() {
  try {
    return (await AsyncStorage.getItem(SAF_DIR_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function safDisplayName(uri) {
  try {
    const decoded = decodeURIComponent(uri);
    const parts = decoded.split('/');
    return parts[parts.length - 1] || decoded;
  } catch (e) {
    return uri;
  }
}

// Opens the system folder picker (needs one user tap), ensures the
// WeatherLogs subfolder, persists its URI. Returns the URI or null.
export async function ensureDownloadAccess() {
  try {
    const already = await getSafDirUri();
    if (already) {
      try {
        await StorageAccessFramework.readDirectoryAsync(already);
        return already;
      } catch (e) {
        // Persisted permission lost — ask again below.
      }
    }
    const downloadRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadRoot);
    if (!perm.granted) return null;
    const grantedUri = perm.directoryUri;

    // If the user picked WeatherLogs itself, use it directly.
    if (safDisplayName(grantedUri) === DOWNLOAD_FOLDER) {
      await AsyncStorage.setItem(SAF_DIR_KEY, grantedUri);
      return grantedUri;
    }

    // Otherwise ensure the WeatherLogs subfolder inside the granted dir.
    const children = await StorageAccessFramework.readDirectoryAsync(grantedUri);
    for (const childUri of children) {
      if (safDisplayName(childUri) === DOWNLOAD_FOLDER) {
        await AsyncStorage.setItem(SAF_DIR_KEY, childUri);
        return childUri;
      }
    }
    const created = await StorageAccessFramework.makeDirectoryAsync(grantedUri, DOWNLOAD_FOLDER);
    await AsyncStorage.setItem(SAF_DIR_KEY, created);
    return created;
  } catch (e) {
    return null;
  }
}

async function writeDownload(timestamp, content) {
  const dirUri = await getSafDirUri();
  if (!dirUri) throw new Error('No SAF directory granted yet');
  // NOTE: fileName is passed WITHOUT extension; the system appends .txt from the MIME type.
  const fileUri = await StorageAccessFramework.createFileAsync(dirUri, `crash_${timestamp}`, 'text/plain');
  await StorageAccessFramework.writeAsStringAsync(fileUri, content);
  return fileUri;
}

export async function listDownloadLogs() {
  try {
    const dirUri = await getSafDirUri();
    if (!dirUri) return [];
    const uris = await StorageAccessFramework.readDirectoryAsync(dirUri);
    const files = [];
    for (const uri of uris) {
      const name = safDisplayName(uri);
      if (!name.endsWith('.txt') && !name.endsWith('.csv')) continue;
      files.push({ name, path: uri, size: 0, mtime: 0, location: 'download' });
    }
    files.sort((a, b) => (a.name < b.name ? 1 : -1));
    return files;
  } catch (e) {
    return [];
  }
}

export async function readDownloadLog(uri) {
  return StorageAccessFramework.readAsStringAsync(uri);
}

export async function deleteDownloadLog(uri) {
  return StorageAccessFramework.deleteAsync(uri);
}

// ---------------------------------------------------------------------------
// Main entry: builds the report, tries Download (adb-readable) first,
// falls back to internal sandbox. Never throws.
// ---------------------------------------------------------------------------
export async function logCrash(error, errorInfo = {}, appState = {}) {
  const timestamp = Date.now();

  const errorDetails = [
    '=== Crash Report ===',
    `Timestamp: ${new Date().toISOString()}`,
    `Timestamp (ms): ${timestamp}`,
    `Error Message: ${error?.message || 'Unknown'}`,
    `Stack Trace: ${error?.stack || 'No stack available'}`,
    `Component Stack: ${errorInfo?.componentStack || 'No component stack'}`,
    '--- App State Snapshot ---',
    `Theme: ${appState.theme || 'unknown'}`,
    `Language: ${appState.language || 'unknown'}`,
    `Cities Count: ${appState.cities?.length ?? appState.citiesCount ?? 0}`,
    `Selected City: ${appState.selectedCity || 'none'}`,
    '------------------------',
  ];

  const content = errorDetails.join('\n');
  let lastError = null;

  try {
    const path = await writeDownload(timestamp, content);
    return { path, location: 'download' };
  } catch (e) {
    lastError = e;
  }

  try {
    const path = await writeInternal(timestamp, content);
    return { path, location: 'internal' };
  } catch (e) {
    lastError = e;
  }

  console.error('Failed to write crash log:', lastError);
  return null;
}

// ---------------------------------------------------------------------------
// Self-test: writes, reads back and deletes a probe file in the sandbox.
// Used by the in-app viewer to diagnose storage problems on the spot.
// ---------------------------------------------------------------------------
export async function testLogWrite() {
  try {
    const dir = getInternalLogDir();
    if (!dir) return { ok: false, error: 'documentDirectory is null' };
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const probe = `${dir}/selftest_probe.txt`;
    await FileSystem.writeAsStringAsync(probe, 'ok');
    const back = await FileSystem.readAsStringAsync(probe);
    await FileSystem.deleteAsync(probe, { idempotent: true });
    if (back !== 'ok') return { ok: false, error: 'read-back mismatch' };
    return { ok: true, dir };
  } catch (e) {
    return { ok: false, error: `${e?.message || e}` };
  }
}
