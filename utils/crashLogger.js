import * as FileSystem from 'expo-file-system';

export const EXTERNAL_LOG_FOLDER = 'WeatherAppLogs';
export const INTERNAL_LOG_FOLDER = 'logs';

function joinDir(base, folder) {
  if (!base) return null;
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}${folder}`;
}

// App-specific external storage: /sdcard/Android/data/<package>/files/WeatherAppLogs
// World-readable via adb with the exact path (no root needed), no extra permissions required.
export function getExternalLogDir() {
  return joinDir(FileSystem.externalDirectory, EXTERNAL_LOG_FOLDER);
}

// Private sandbox fallback: /data/user/0/<package>/files/logs
export function getInternalLogDir() {
  return joinDir(FileSystem.documentDirectory, INTERNAL_LOG_FOLDER);
}

export function getLogDirs() {
  const dirs = [];
  const external = getExternalLogDir();
  if (external) dirs.push({ dir: external, location: 'external' });
  const internal = getInternalLogDir();
  if (internal) dirs.push({ dir: internal, location: 'internal' });
  return dirs;
}

async function writeToDir(dir, timestamp, content) {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const filePath = `${dir}/crash_${timestamp}.txt`;
  await FileSystem.writeAsStringAsync(filePath, content);
  return filePath;
}

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

  // Try every known location in order: external first (adb-readable), then internal.
  for (const { dir, location } of getLogDirs()) {
    try {
      const filePath = await writeToDir(dir, timestamp, content);
      return { path: filePath, location };
    } catch (e) {
      lastError = e;
    }
  }

  // The logger itself must never throw — fall back to console output.
  console.error('Failed to write crash log:', lastError);
  return null;
}
