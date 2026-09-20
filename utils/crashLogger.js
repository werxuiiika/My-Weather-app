import { FileSystem } from 'expo-file-system';

const CATEGORIES = {
  THEME: 'theme',
  LANGUAGE: 'language',
  CITIES: 'cities',
};

export function logCrash(error, errorInfo = {}, appState = {}) {
  const timestamp = Date.now();
  const logPath = `${FileSystem.documentDirectory}logs/crash_${timestamp}.txt`;

  const errorDetails = [
    `=== Crash Report ===`,
    `Timestamp: ${new Date().toISOString()}`,
    `Timestamp (ms): ${timestamp}`,
    `Error Message: ${error.message || 'Unknown'}`,
    `Stack Trace: ${error.stack || 'No stack available'}`,
    `Component Stack: ${errorInfo.componentStack || 'No component stack'}`,
    `--- App State Snapshot ---`,
    `Theme: ${appState.theme || 'unknown'}`,
    `Language: ${appState.language || 'unknown'}`,
    `Cities Count: ${appState.cities?.length || 0}`,
    `Selected City: ${appState.selectedCity || 'none'}`,
    `------------------------`,
  ];

  const content = errorDetails.join('\n');

  try {
    // Ensure logs directory exists
    const logsDir = `${FileSystem.documentDirectory}logs`;
    FileSystem.makeDirectory(logsDir, { intermediates: true });

    // Write crash report
    FileSystem.writeAsStringAsync(logsDir + '/crash_' + timestamp + '.txt', content, {
      encoding: 'utf-8',
    });
  } catch (writeError) {
    // If even the logger fails, at least try console output
    console.error('Failed to write crash log:', writeError);
  }
}