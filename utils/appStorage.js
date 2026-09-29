// App-owned storage base, shared by crash logs and city backups.
//
// SDK 57's JS API only exposes the app's own sandbox
// (documentDirectory = /data/user/0/<package>/files/ on Android,
// the app container on iOS). That is enough for this use case: zero
// permissions, zero folder picking, auto-created subfolders, and — unlike
// MIUI-locked Download — nothing the OS can block. The trade-off is that
// the files are not visible in a file manager; on a dev build they can be
// pulled with `adb shell run-as <package> ...` (debug builds only).
import * as FileSystem from 'expo-file-system/legacy';

export const APP_FOLDER = 'MyWeatherApp';

export function getStorageBase() {
  return FileSystem.externalStorageDirectory || FileSystem.documentDirectory;
}

export function getAppStorageRoot() {
  const base = getStorageBase();
  if (!base) return null;
  return `${base.endsWith('/') ? base : `${base}/`}${APP_FOLDER}/`;
}

export async function ensureDir(dir) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}
