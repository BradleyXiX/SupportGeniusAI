// ==========================================================================
// SupportGeniusAI Marketing Landing Controller
// Pure ES Module • Strict CSP Compliant • Native Scrolling, Signal Core, Chapters & Examples
// Governed by Task 04 & docs/design-v3/design-enhancements.md
// ==========================================================================

import { initChapters } from './marketing/chapters.js';
import { initExamples } from './marketing/examples.js';
import {
  MotionState,
  getStoredMotionPreference,
  setStoredMotionPreference,
  isReducedMotionPreferred
} from './marketing/motion-policy.js';

export function initLanding() {
  // Smooth in-page anchor navigation preserving native URL fragments & history
  const scrollToTarget = (targetEl, updateHistory = false, targetId = '') => {
    if (!targetEl) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    if (targetEl.getAttribute('tabindex') === null && !/^(a|button|input|textarea|select)$/i.test(targetEl.tagName)) {
      targetEl.setAttribute('tabindex', '-1');
    }
    targetEl.focus({ preventScroll: true });

    if (updateHistory && targetId) {
      if (typeof history.pushState === 'function') {
        history.pushState(null, '', '#' + targetId);
      } else {
        window.location.hash = targetId;
      }
    }
  };

  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').substring(1);
      if (!targetId) return;

      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        scrollToTarget(targetEl, true, targetId);
      }
    });
  });

  // Handle browser back/forward (popstate) to restore section focus
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const targetId = hash.substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        scrollToTarget(targetEl, false);
      }
    }
  });

  // Direct load with hash: ensure accessible focus
  if (window.location.hash && window.location.hash.length > 1) {
    const targetId = window.location.hash.substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      setTimeout(() => scrollToTarget(targetEl, false), 50);
    }
  }

  // Signal Core 3D Point Sculpture Controller (Hero motion)
  initSignalCore();

  // System Chapters Disclosure Controller
  initChapters();

  // Scripted Interactive Examples Controller
  initExamples();
}

export function initSignalCore() {
  const canvas = document.querySelector('#signal-core');
  const toggle = document.querySelector('#motion-toggle');
  const poster = document.querySelector('#core-poster');
  if (!canvas || !toggle || !poster) return null;

  const stage = canvas.closest('.core-stage') || canvas;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let currentState = MotionState.POSTER;
  let teardown = null;
  let generation = 0;
  let failed = false;
  let visibilityObserver = null;
  let isStageVisible = true;

  function applyUIState(state) {
    currentState = state;
    stage.setAttribute('data-motion-state', state);

    switch (state) {
      case MotionState.RUNNING:
        toggle.textContent = 'Pause animations';
        toggle.setAttribute('aria-pressed', 'true');
        toggle.disabled = false;
        canvas.hidden = false;
        if (poster) poster.style.visibility = 'hidden';
        break;

      case MotionState.LOADING:
        toggle.textContent = 'Pause animations';
        toggle.setAttribute('aria-pressed', 'true');
        toggle.disabled = false;
        canvas.hidden = true;
        if (poster) poster.style.visibility = 'visible';
        break;

      case MotionState.USER_PAUSED:
        toggle.textContent = 'Resume animations';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
        canvas.hidden = true;
        if (poster) poster.style.visibility = 'visible';
        break;

      case MotionState.SYSTEM_REDUCED:
        toggle.textContent = 'Reduced motion enabled';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
        canvas.hidden = true;
        if (poster) poster.style.visibility = 'visible';
        break;

      case MotionState.FAILED:
        failed = true;
        toggle.textContent = 'Static artwork active';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = true;
        canvas.hidden = true;
        if (poster) poster.style.visibility = 'visible';
        break;

      case MotionState.POSTER:
      case MotionState.ELIGIBLE:
      default:
        toggle.textContent = 'Pause animations';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
        canvas.hidden = true;
        if (poster) poster.style.visibility = 'visible';
        break;
    }
  }

  async function activate() {
    if (failed) return;
    if (isReducedMotionPreferred()) {
      applyUIState(MotionState.SYSTEM_REDUCED);
      return;
    }
    if (getStoredMotionPreference() === 'paused') {
      applyUIState(MotionState.USER_PAUSED);
      return;
    }
    if (document.hidden) {
      applyUIState(MotionState.ELIGIBLE);
      return;
    }

    const attempt = ++generation;
    applyUIState(MotionState.LOADING);

    try {
      const { mountCore } = await import('./marketing/signal-core.js');

      // Cancellation check: was activation invalidated while import was in flight?
      if (
        attempt !== generation ||
        isReducedMotionPreferred() ||
        document.hidden ||
        getStoredMotionPreference() === 'paused'
      ) {
        if (isReducedMotionPreferred()) {
          applyUIState(MotionState.SYSTEM_REDUCED);
        } else if (getStoredMotionPreference() === 'paused') {
          applyUIState(MotionState.USER_PAUSED);
        } else {
          applyUIState(MotionState.ELIGIBLE);
        }
        return;
      }

      // Successful activation
      teardown = mountCore(canvas, poster, {
        onDispose: () => {
          teardown = null;
          if (!failed && currentState === MotionState.RUNNING) {
            applyUIState(MotionState.USER_PAUSED);
          }
        }
      });

      applyUIState(MotionState.RUNNING);
    } catch {
      failed = true;
      applyUIState(MotionState.FAILED);
    }
  }

  // Handle user interaction
  toggle.addEventListener('click', () => {
    if (failed) return;

    if (isReducedMotionPreferred()) {
      applyUIState(MotionState.SYSTEM_REDUCED);
      return;
    }

    generation++;

    if (teardown || currentState === MotionState.RUNNING || currentState === MotionState.LOADING) {
      // User pauses
      setStoredMotionPreference('paused');
      if (teardown) {
        const td = teardown;
        teardown = null;
        td();
      }
      applyUIState(MotionState.USER_PAUSED);
    } else {
      // User resumes
      setStoredMotionPreference('running');
      activate();
    }
  });

  const onReducedMotionChange = () => {
    if (reducedQuery.matches) {
      generation++;
      if (teardown) {
        const td = teardown;
        teardown = null;
        td();
      }
      if (!failed) {
        applyUIState(MotionState.SYSTEM_REDUCED);
      }
    } else {
      if (!failed && !teardown) {
        if (getStoredMotionPreference() === 'paused') {
          applyUIState(MotionState.USER_PAUSED);
        } else {
          activate();
        }
      }
    }
  };

  if (typeof reducedQuery.addEventListener === 'function') {
    reducedQuery.addEventListener('change', onReducedMotionChange);
  } else if (typeof reducedQuery.addListener === 'function') {
    reducedQuery.addListener(onReducedMotionChange);
  }

  const onPageHide = () => {
    generation++;
    if (teardown) {
      const td = teardown;
      teardown = null;
      td();
    }
  };

  const onPageShow = () => {
    if (failed) return;
    if (isReducedMotionPreferred()) {
      applyUIState(MotionState.SYSTEM_REDUCED);
    } else if (getStoredMotionPreference() === 'paused') {
      applyUIState(MotionState.USER_PAUSED);
    } else if (!teardown) {
      activate();
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      if (currentState === MotionState.LOADING) {
        generation++;
        applyUIState(MotionState.ELIGIBLE);
      }
    } else if (!teardown && !failed && currentState === MotionState.ELIGIBLE) {
      activate();
    }
  };

  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Auto-start policy: Default is on after first paint for eligible visible scenes
  if (isReducedMotionPreferred()) {
    applyUIState(MotionState.SYSTEM_REDUCED);
  } else if (getStoredMotionPreference() === 'paused') {
    applyUIState(MotionState.USER_PAUSED);
  } else {
    applyUIState(MotionState.ELIGIBLE);

    // Stage visibility tracking for auto-start
    if (typeof IntersectionObserver !== 'undefined') {
      visibilityObserver = new IntersectionObserver((entries) => {
        isStageVisible = Boolean(entries[0]?.isIntersecting);
        if (isStageVisible && !teardown && !failed && currentState === MotionState.ELIGIBLE && !document.hidden) {
          visibilityObserver.disconnect();
          visibilityObserver = null;
          activate();
        }
      }, { threshold: 0.02 });
      visibilityObserver.observe(stage);
    }

    // Auto-start after first paint for visible eligible hero
    requestAnimationFrame(() => {
      if (!teardown && !failed && currentState === MotionState.ELIGIBLE && !document.hidden) {
        const rect = stage.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
        if (inViewport) {
          visibilityObserver?.disconnect();
          visibilityObserver = null;
          activate();
        }
      }
    });
  }

  const controller = {
    getState: () => currentState,
    getTeardown: () => teardown,
    pause: () => {
      setStoredMotionPreference('paused');
      generation++;
      if (teardown) {
        const td = teardown;
        teardown = null;
        td();
      }
      applyUIState(MotionState.USER_PAUSED);
    },
    resume: () => {
      setStoredMotionPreference('running');
      activate();
    },
    destroy: () => {
      generation++;
      visibilityObserver?.disconnect();
      visibilityObserver = null;
      if (teardown) {
        const td = teardown;
        teardown = null;
        td();
      }
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof reducedQuery.removeEventListener === 'function') {
        reducedQuery.removeEventListener('change', onReducedMotionChange);
      } else if (typeof reducedQuery.removeListener === 'function') {
        reducedQuery.removeListener(onReducedMotionChange);
      }
      applyUIState(MotionState.DISPOSED);
    }
  };

  if (typeof window !== 'undefined') {
    window.__signalCore = controller;
  }

  return controller;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanding);
} else {
  initLanding();
}
