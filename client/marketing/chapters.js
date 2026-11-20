// ==========================================================================
// SupportGeniusAI System Chapters Disclosure Controller
// Ensures single-open exclusive disclosure across all browser engines.
// Pure ES Module • Strict CSP Compliant • Native Accessible Markup
// Governed by Task 05 & design.md
// ==========================================================================

export function initChapters(container = document) {
  const detailsElements = container.querySelectorAll('details[name="system-chapters"]');
  if (!detailsElements.length) return () => {};

  const onToggle = (event) => {
    if (event.target.open) {
      detailsElements.forEach((detail) => {
        if (detail !== event.target && detail.open) {
          detail.open = false;
        }
      });
    }
  };

  detailsElements.forEach((detail) => {
    detail.addEventListener('toggle', onToggle);
  });

  return () => {
    detailsElements.forEach((detail) => {
      detail.removeEventListener('toggle', onToggle);
    });
  };
}
