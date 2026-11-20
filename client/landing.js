// ==========================================================================
// SupportGeniusAI Marketing Landing Controller
// Pure ES Module • Strict CSP Compliant • Native Scrolling, Signal Core, Chapters & Examples
// Governed by Task 06 & design.md
// ==========================================================================

import { initChapters } from './marketing/chapters.js';
import { initExamples } from './marketing/examples.js';

export function initLanding() {
  // Smooth in-page anchor navigation using native scrolling & accessible focus
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').substring(1);
      if (!targetId) return;

      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
        if (targetEl.getAttribute('tabindex') === null && !/^(a|button|input|textarea|select)$/i.test(targetEl.tagName)) {
          targetEl.setAttribute('tabindex', '-1');
        }
        targetEl.focus({ preventScroll: true });
      }
    });
  });

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

  const resetMotionControl = () => {
    teardown = null;
    toggle.textContent = 'Enable motion';
    toggle.setAttribute('aria-pressed', 'false');
  };

  toggle.addEventListener('click', async () => {
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
      if (attempt !== generation || reduced.matches || document.hidden) {
        if (reduced.matches) {
          toggle.textContent = 'Reduced motion enabled';
          toggle.setAttribute('aria-pressed', 'false');
        }
        return;
      }
      teardown = mountCore(canvas, poster, { onDispose: resetMotionControl });
      toggle.textContent = 'Pause motion';
      toggle.setAttribute('aria-pressed', 'true');
    } catch {
      toggle.textContent = 'Static artwork active';
      toggle.setAttribute('aria-pressed', 'false');
    } finally {
      toggle.disabled = false;
    }
  });

  const onReducedMotionChange = () => {
    if (reduced.matches) {
      generation++;
      if (teardown) {
        teardown();
      }
      toggle.textContent = 'Reduced motion enabled';
      toggle.setAttribute('aria-pressed', 'false');
    } else {
      if (!teardown) {
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
    }
  };

  window.addEventListener('pagehide', onPageHide);

  return {
    getTeardown: () => teardown,
    destroy: () => {
      generation++;
      if (teardown) teardown();
      window.removeEventListener('pagehide', onPageHide);
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
