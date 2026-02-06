import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_LOGS_KEY = '@pickleplay_screen_logs';
const MAX_LOGS = 100; // Keep last 100 logs

// Screens that are in the global footer
const FOOTER_SCREENS = ['Home', 'FindCourts', 'Map', 'Shop', 'Community', 'Profile'];

/**
 * Log a screen visit
 * @param {string} screenName - Name of the screen being opened
 * @param {object} params - Optional parameters passed to the screen
 */
export const logScreenVisit = async (screenName, params = {}) => {
  try {
    const isFooterScreen = FOOTER_SCREENS.includes(screenName);
    
    const logEntry = {
      screenName,
      timestamp: new Date().toISOString(),
      isFooterScreen,
      params: params ? JSON.stringify(params) : null,
    };

    // Always log to console
    if (!isFooterScreen) {
      console.log(`[SCREEN LOG] User opened: ${screenName}`, {
        timestamp: logEntry.timestamp,
        params: params,
      });
    }

    // Store non-footer screen visits
    if (!isFooterScreen) {
      const existingLogs = await getScreenLogs();
      const updatedLogs = [logEntry, ...existingLogs].slice(0, MAX_LOGS);
      await AsyncStorage.setItem(SCREEN_LOGS_KEY, JSON.stringify(updatedLogs));
    }

    return logEntry;
  } catch (error) {
    console.error('Error logging screen visit:', error);
    return null;
  }
};

/**
 * Get all stored screen logs
 * @returns {Array} Array of log entries
 */
export const getScreenLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem(SCREEN_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting screen logs:', error);
    return [];
  }
};

/**
 * Clear all screen logs
 */
export const clearScreenLogs = async () => {
  try {
    await AsyncStorage.removeItem(SCREEN_LOGS_KEY);
    console.log('[SCREEN LOG] All logs cleared');
  } catch (error) {
    console.error('Error clearing screen logs:', error);
  }
};

/**
 * Get logs for a specific screen
 * @param {string} screenName - Name of the screen to filter by
 * @returns {Array} Array of log entries for that screen
 */
export const getLogsForScreen = async (screenName) => {
  try {
    const allLogs = await getScreenLogs();
    return allLogs.filter(log => log.screenName === screenName);
  } catch (error) {
    console.error('Error getting logs for screen:', error);
    return [];
  }
};

/**
 * Get count of visits for each non-footer screen
 * @returns {Object} Object with screen names as keys and visit counts as values
 */
export const getScreenVisitCounts = async () => {
  try {
    const allLogs = await getScreenLogs();
    const counts = {};
    
    allLogs.forEach(log => {
      if (!counts[log.screenName]) {
        counts[log.screenName] = 0;
      }
      counts[log.screenName]++;
    });
    
    return counts;
  } catch (error) {
    console.error('Error getting screen visit counts:', error);
    return {};
  }
};

export default {
  logScreenVisit,
  getScreenLogs,
  clearScreenLogs,
  getLogsForScreen,
  getScreenVisitCounts,
};
