// ==========================================================================
// SupportGeniusAI Marketing Landing Controller
// Pure ES Module • Strict CSP Compliant • Native Scrolling
// Governed by Task 3 / A3
// ==========================================================================

export function initLanding() {
  // Smooth in-page anchor navigation using native scrolling
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href").substring(1);
      if (!targetId) return;

      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start"
        });
      }
    });
  });

  // Verify orb placeholder container
  const orbMount = document.querySelector("[data-orb]");
  if (orbMount) {
    orbMount.setAttribute("data-initialized", "static");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLanding);
} else {
  initLanding();
}

