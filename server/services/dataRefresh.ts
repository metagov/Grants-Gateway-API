// Background data refresh service for improved performance
import { projectsCache, poolsCache, refreshStaleKarmaData } from './cache.js';

// Background refresh intervals
const KARMA_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const PROJECTS_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const POOLS_REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes

let refreshTimers: NodeJS.Timeout[] = [];

export function startBackgroundRefresh() {
  console.log('Starting background data refresh service...');
  
  // Refresh popular Karma projects periodically
  const karmaTimer = setInterval(async () => {
    try {
      await refreshStaleKarmaData();
      console.log('Background: Refreshed popular Karma projects');
    } catch (error) {
      console.warn('Background: Failed to refresh Karma data:', error);
    }
  }, KARMA_REFRESH_INTERVAL);
  
  refreshTimers.push(karmaTimer);
  
  // Could add more background refresh tasks here for pools and projects
  // when we implement more aggressive caching
}

export function stopBackgroundRefresh() {
  console.log('Stopping background data refresh service...');
  refreshTimers.forEach(timer => clearInterval(timer));
  refreshTimers = [];
}

// Preload commonly requested data
export async function preloadCommonData() {
  try {
    // Preload popular projects Karma UIDs
    await refreshStaleKarmaData();
    console.log('Preloaded popular Karma project UIDs');
  } catch (error) {
    console.warn('Failed to preload common data:', error);
  }
}

// Health check for background services
export function getRefreshServiceStatus() {
  return {
    activeTimers: refreshTimers.length,
    karmaRefreshInterval: KARMA_REFRESH_INTERVAL,
    projectsRefreshInterval: PROJECTS_REFRESH_INTERVAL,
    poolsRefreshInterval: POOLS_REFRESH_INTERVAL,
    isActive: refreshTimers.length > 0
  };
}