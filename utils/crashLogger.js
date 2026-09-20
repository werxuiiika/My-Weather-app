import * as FileSystem from 'expo-file-system';

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

  try {
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir) {
      console.error('Failed to write crash log: documentDirectory is null');
      return null;
    }
    const logsDir = `${baseDir}logs`;

    const dirInfo = await FileSystem.getInfoAsync(logsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(logsDir, { intermediates: true });
    }

    const filePath = `${logsDir}/crash_${timestamp}.txt`;
    await FileSystem.writeAsStringAsync(filePath, content);
    return filePath;
  } catch (writeError) {
    // The logger itself must never throw — fall back to console output.
    console.error('Failed to write crash log:', writeError);
    return null;
  }
}
