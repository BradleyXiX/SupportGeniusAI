// ==========================================================================
// SupportGeniusAI Shared Motion Policy & Lifecycle State Machine
// Governed by Task 04 & docs/design-v3/design-enhancements.md
// ==========================================================================

export const MOTION_PREFERENCE_KEY = 'sg_motion_v1';

export const MotionState = Object.freeze({
  POSTER: 'poster',
  ELIGIBLE: 'eligible',
  LOADING: 'loading',
  RUNNING: 'running',
  USER_PAUSED: 'user-paused',
  SYSTEM_REDUCED: 'system-reduced',
  SUSPENDED: 'suspended',
  FAILED: 'failed',
  DISPOSED: 'disposed'
});

// Safe in-memory fallback if localStorage throws (e.g. sandboxed iframe or private browsing)
let inMemoryPreference = null;
const preferenceSubscribers = new Set();

// ==========================================================================
// SupportGeniusAI Scene Scheduler Registry
// Coordinates large art scenes (hero, closing) and atmospheric textures.
// Tracks actual running/visible scene state instead of a single fragile boolean.
// Releases scheduler ownership on pause, failure, disposal, and pagehide navigation.
// ==========================================================================

const registeredScenes = new Map(); // id -> { isRunning: boolean, isVisible: boolean, priority: number }
const schedulerSubscribers = new Set();

export function registerScene(id, { priority = 1 } = {}) {
  registeredScenes.set(id, { isRunning: false, isVisible: false, priority });
  notifyScheduler();

  return {
    updateState({ isRunning, isVisible }) {
      const scene = registeredScenes.get(id);
      if (!scene) return;
      if (typeof isRunning === 'boolean') scene.isRunning = isRunning;
      if (typeof isVisible === 'boolean') scene.isVisible = isVisible;
      notifyScheduler();
    },
    release() {
      registeredScenes.delete(id);
      notifyScheduler();
    }
  };
}

export function isAnyLargeSceneActive() {
  for (const scene of registeredScenes.values()) {
    if (scene.isRunning && scene.isVisible) {
      return true;
    }
  }
  return false;
}

export function getActiveScenes() {
  const active = [];
  for (const [id, scene] of registeredScenes.entries()) {
    if (scene.isRunning && scene.isVisible) {
      active.push({ id, ...scene });
    }
  }
  return active;
}

export function getPrimaryActiveScene() {
  const active = getActiveScenes();
  if (active.length === 0) return null;
  // Lowest priority number = highest precedence (e.g. priority 1 > priority 2)
  active.sort((a, b) => a.priority - b.priority);
  return active[0].id;
}

export function subscribeScheduler(callback) {
  schedulerSubscribers.add(callback);
  // Initial callback with current state
  try {
    callback({
      isLargeSceneActive: isAnyLargeSceneActive(),
      activeScenes: getActiveScenes(),
      primaryScene: getPrimaryActiveScene()
    });
  } catch {}
  return () => schedulerSubscribers.delete(callback);
}

function notifyScheduler() {
  const isLargeActive = isAnyLargeSceneActive();
  const activeScenes = getActiveScenes();
  const primaryScene = getPrimaryActiveScene();
  schedulerSubscribers.forEach((cb) => {
    try {
      cb({ isLargeSceneActive: isLargeActive, activeScenes, primaryScene });
    } catch {}
  });
}

// Global release of scheduler ownership on page navigation / unload
if (typeof window !== 'undefined') {
  const releaseAll = () => {
    registeredScenes.clear();
    notifyScheduler();
  };
  window.addEventListener('pagehide', releaseAll);
  window.addEventListener('beforeunload', releaseAll);
}

export function subscribeMotionPreference(callback) {
  preferenceSubscribers.add(callback);
  return () => preferenceSubscribers.delete(callback);
}

export function notifyMotionPreferenceChange() {
  const allowed = isMotionAllowed();
  preferenceSubscribers.forEach((cb) => {
    try {
      cb(allowed);
    } catch {}
  });
}

export function getStoredMotionPreference() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(MOTION_PREFERENCE_KEY);
      if (stored !== null) return stored;
    }
  } catch {
    // Graceful fallback to in-memory preference when localStorage is inaccessible
  }
  return inMemoryPreference;
}

export function setStoredMotionPreference(value) {
  inMemoryPreference = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (value === null || value === 'running') {
        window.localStorage.removeItem(MOTION_PREFERENCE_KEY);
      } else {
        window.localStorage.setItem(MOTION_PREFERENCE_KEY, value);
      }
    }
  } catch {
    // Silently continue with in-memory preference on storage errors (e.g. SecurityError)
  }
  notifyMotionPreferenceChange();
}

export function isReducedMotionPreferred() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMotionAllowed() {
  if (isReducedMotionPreferred()) return false;
  const pref = getStoredMotionPreference();
  if (pref === 'paused') return false;
  return true;
}
