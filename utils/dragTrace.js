import * as FileSystem from 'expo-file-system/legacy';
import { getPublicLogDir } from './crashLogger';
import { ensureDir } from './appStorage';

const MAX_FILES = 10;
const PREFIX = 'drag_';

// Rows: ['s', t, y] sample | ['x', t, index, dir] swap event | ['e', t, offset, newIndex] release.
function toCsv(rows) {
  const lines = ['type,t,a,b'];
  for (const r of rows) {
    if (Array.isArray(r)) lines.push(r.join(','));
  }
  return lines.join('\n');
}

async function trimPlain(dir) {
  try {
    const names = await FileSystem.readDirectoryAsync(dir);
    const ours = names.filter((n) => n.startsWith(PREFIX)).sort();
    while (ours.length > MAX_FILES) {
      const oldest = ours.shift();
      try {
        await FileSystem.deleteAsync(`${dir}/${oldest}`, { idempotent: true });
      } catch (e) {}
    }
  } catch (e) {}
}

// Fire-and-forget from the gesture completion callback. Never throws.
export async function saveDragTrace(rows) {
  try {
    if (!Array.isArray(rows) || rows.length < 5) return null;
    const csv = toCsv(rows);
    const ts = Date.now();
    try {
      const dir = getPublicLogDir();
      if (dir) {
        await ensureDir(dir);
        const path = `${dir}${PREFIX}${ts}.csv`;
        await FileSystem.writeAsStringAsync(path, csv);
        await trimPlain(dir);
        return path;
      }
    } catch (e) {}
    const base = FileSystem.documentDirectory;
    if (!base) return null;
    const dir = `${base.endsWith('/') ? base : `${base}/`}dragtraces`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const path = `${dir}/${PREFIX}${ts}.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    await trimPlain(dir);
    return path;
  } catch (e) {
    return null;
  }
}
