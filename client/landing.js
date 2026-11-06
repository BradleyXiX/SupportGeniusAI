// ==========================================================================
// SupportGeniusAI Marketing Landing Controller
// Pure ES Module • Strict CSP Compliant • Native Scrolling & Orb Lifecycle
// Governed by Task 3 & Task 5
// ==========================================================================

import { mountOrb } from "./orb.js";

let landingOrb = null;

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

  // Mount Signal Orb on [data-orb]
  const orbMount = document.querySelector("[data-orb]");
  if (orbMount) {
    let canvas = orbMount.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      canvas.setAttribute("aria-hidden", "true");
      canvas.className = "signal-orb-canvas";
      orbMount.innerHTML = "";
      orbMount.appendChild(canvas);
    }
    landingOrb = mountOrb(canvas, { state: "idle", animateIdle: true });
  }
}

window.addEventListener("unload", () => {
  if (landingOrb) {
    landingOrb.destroy();
    landingOrb = null;
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLanding);
} else {
  initLanding();
}
