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
