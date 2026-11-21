// ==========================================================================
// SupportGeniusAI System Chapters & Orbits Controller
// Pure ES Module • Strict CSP Compliant • Native Accessible Markup
// Governed by Task 05 & docs/design-v3/design-enhancements.md
// ==========================================================================

import {
  isMotionAllowed,
  isReducedMotionPreferred,
  subscribeMotionPreference
} from './motion-policy.js';

export function initChapters(container = document) {
  const detailsElements = container.querySelectorAll('details[name="system-chapters"]');
  const orbitSmall = container.querySelector('.orbit-small');
  if (!detailsElements.length && !orbitSmall) return () => {};

  // Active chapter tracking for illustrative orbit path highlight
  const updateActiveChapter = () => {
    if (!orbitSmall) return;
    let activeIdx = 1; // default to Chapter 1
    detailsElements.forEach((detail, idx) => {
      if (detail.open) {
        activeIdx = idx + 1;
      }
    });
    orbitSmall.setAttribute('data-active-chapter', String(activeIdx));
  };

  updateActiveChapter();

  const onToggle = (event) => {
    if (event.target.open) {
      detailsElements.forEach((detail) => {
        if (detail !== event.target && detail.open) {
          detail.open = false;
        }
      });
    }
    updateActiveChapter();
  };

  detailsElements.forEach((detail) => {
    detail.addEventListener('toggle', onToggle);
  });

  // System Logo Orbits: Subscribe strictly to shared motion policy without independent frame loops
  let cleanupOrbits = () => {};
  if (orbitSmall) {
    let isIntersecting = true;
    let isDocVisible = !document.hidden;
    let isGlobalMotionAllowed = isMotionAllowed();
    let observer = null;

    const updatePlayState = () => {
      const shouldAnimate =
        isGlobalMotionAllowed &&
        !isReducedMotionPreferred() &&
        isDocVisible &&
        isIntersecting;
      orbitSmall.setAttribute('data-motion', shouldAnimate ? 'running' : 'paused');
    };

    updatePlayState();

    const unsubscribeMotion = subscribeMotionPreference((allowed) => {
      isGlobalMotionAllowed = allowed;
      updatePlayState();
    });

    const onVisibilityChange = () => {
      isDocVisible = !document.hidden;
      updatePlayState();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onPageHide = () => {
      isDocVisible = false;
      updatePlayState();
    };
    const onPageShow = () => {
      isDocVisible = !document.hidden;
      isGlobalMotionAllowed = isMotionAllowed();
      updatePlayState();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          isIntersecting = Boolean(entries[0]?.isIntersecting);
          updatePlayState();
        },
        { threshold: 0.02 }
      );
      observer.observe(orbitSmall);
    }

    cleanupOrbits = () => {
      unsubscribeMotion();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      observer?.disconnect();
    };
  }

  return () => {
    detailsElements.forEach((detail) => {
      detail.removeEventListener('toggle', onToggle);
    });
    cleanupOrbits();
  };
}
