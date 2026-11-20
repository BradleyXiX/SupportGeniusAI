// ==========================================================================
// SupportGeniusAI Marketing Landing Controller
// Pure ES Module • Strict CSP Compliant • Native Scrolling, Signal Core, Chapters & Examples
// Governed by Task 06 & design.md
// ==========================================================================

import { initChapters } from './marketing/chapters.js';
import { initExamples } from './marketing/examples.js';

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

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let teardown = null;
  let generation = 0;
  let failed = false;

  const resetMotionControl = () => {
    teardown = null;
    toggle.textContent = 'Enable motion';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.disabled = false;
  };

  // Enable control once handler is installed
  toggle.disabled = false;

  toggle.addEventListener('click', async () => {
    if (failed) return;
    const attempt = ++generation;
    if (teardown) {
      teardown();
      return;
    }

    if (reduced.matches) {
      toggle.textContent = 'Reduced motion enabled';
      toggle.setAttribute('aria-pressed', 'false');
      return;
    }

    toggle.disabled = true;
    try {
      const { mountCore } = await import('./marketing/signal-core.js');
      // Cancellation check: was activation invalidated while import was in flight?
      if (attempt !== generation || reduced.matches || document.hidden) {
        if (reduced.matches) {
          toggle.textContent = 'Reduced motion enabled';
          toggle.setAttribute('aria-pressed', 'false');
          toggle.disabled = false;
        } else {
          toggle.textContent = 'Enable motion';
          toggle.setAttribute('aria-pressed', 'false');
          toggle.disabled = false;
        }
        return;
      }

      // Successful activation
      teardown = mountCore(canvas, poster, { onDispose: resetMotionControl });
      toggle.disabled = false;
      toggle.textContent = 'Pause motion';
      toggle.setAttribute('aria-pressed', 'true');
    } catch {
      // Failed enhancement module must not leave a fake working control
      failed = true;
      toggle.textContent = 'Static artwork active';
      toggle.setAttribute('aria-pressed', 'false');
      toggle.disabled = true;
    }
  });

  const onReducedMotionChange = () => {
    if (reduced.matches) {
      generation++;
      if (teardown) {
        teardown();
      }
      if (!failed) {
        toggle.textContent = 'Reduced motion enabled';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
      }
    } else {
      if (!teardown && !failed) {
        toggle.disabled = false;
        toggle.textContent = 'Enable motion';
        toggle.setAttribute('aria-pressed', 'false');
      }
    }
  };

  if (typeof reduced.addEventListener === 'function') {
    reduced.addEventListener('change', onReducedMotionChange);
  } else if (typeof reduced.addListener === 'function') {
    reduced.addListener(onReducedMotionChange);
  }

  const onPageHide = () => {
    generation++;
    if (teardown) {
      teardown();
    } else if (!failed) {
      resetMotionControl();
    }
  };

  const onPageShow = () => {
    if (!teardown && !failed) {
      if (reduced.matches) {
        toggle.textContent = 'Reduced motion enabled';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
      } else {
        toggle.textContent = 'Enable motion';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
      }
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      if (!teardown) {
        generation++;
      }
    } else if (!teardown && !failed) {
      if (reduced.matches) {
        toggle.textContent = 'Reduced motion enabled';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
      } else {
        toggle.textContent = 'Enable motion';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.disabled = false;
      }
    }
  };

  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    getTeardown: () => teardown,
    destroy: () => {
      generation++;
      if (teardown) teardown();
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof reduced.removeEventListener === 'function') {
        reduced.removeEventListener('change', onReducedMotionChange);
      } else if (typeof reduced.removeListener === 'function') {
        reduced.removeListener(onReducedMotionChange);
      }
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanding);
} else {
  initLanding();
}
