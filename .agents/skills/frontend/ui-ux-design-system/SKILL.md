---
name: ui-ux-design-system
description: Enterprise UI/UX design system specifications, tokenized 4px spacing scale, WCAG AA contrast compliance, fluid micro-interactions, and accessible keyboard navigation.
---

# UI/UX Design System & Accessibility Standards

The `ui-ux-design-system` skill provides the structural foundation for all user interaction patterns in SupportGeniusAI. Every component must satisfy the mathematical precision of our 4px token scale, meet strict WCAG 2.1 AA accessibility mandates, provide haptic-like visual feedback, and support seamless keyboard navigation.

---

## 1. Tokenized 4px Spacing Scale

Arbitrary pixel values (e.g., `margin: 17px`) are strictly forbidden. All spacing, padding, margins, and layout dimensions must map directly to our 4px geometric scale.

```css
:root {
  /* 4px Base Spacing Scale */
  --space-1:  0.25rem; /*  4px */
  --space-2:  0.5rem;  /*  8px */
  --space-3:  0.75rem; /* 12px */
  --space-4:  1rem;    /* 16px */
  --space-5:  1.25rem; /* 20px */
  --space-6:  1.5rem;  /* 24px */
  --space-8:  2rem;    /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-20: 5rem;    /* 80px */
  --space-24: 6rem;    /* 96px */
  --space-32: 8rem;    /* 128px */

  /* Component Border Radii */
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.5rem;  /* 8px */
  --radius-lg: 0.75rem; /* 12px */
  --radius-xl: 1rem;    /* 16px */
  --radius-full: 9999px;
}
```

---

## 2. WCAG AA / AAA Accessibility & Contrast

SupportGeniusAI requires strict compliance with **WCAG 2.1 Level AA**:
- **Normal Text (< 18pt or < 14pt bold)**: Minimum contrast ratio of **4.5:1** against adjacent backgrounds.
- **Large Text (≥ 18pt or ≥ 14pt bold)**: Minimum contrast ratio of **3.0:1**.
- **Interactive UI Components & Graphical Objects**: Minimum contrast ratio of **3.0:1** for boundaries and active states.

### Accessible High-Contrast Focus Rings
Focus states must never be removed (`outline: none` without replacement is a critical violation). Focus rings must be sharply distinct and offset from the component boundary:

```css
/* Universal High-Contrast Focus Ring */
:focus-visible {
  outline: 2px solid var(--accent-amber, #f59e0b);
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25);
  transition: outline-offset 150ms ease;
}
```

---

## 3. Tactile Micro-Interactions & Physics Easing

Buttons, toggles, and cards must communicate state changes through spring-like, tactile micro-interactions.

```css
/* Spring Timing Utility */
:root {
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}

.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-inverse);
  background-color: var(--accent-amber);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transform: translateZ(0);
  transition: transform 180ms var(--ease-spring),
              background-color 180ms ease,
              box-shadow 180ms var(--ease-spring);
}

.button-primary:hover {
  transform: translateY(-2px) scale(1.01);
  background-color: #d97706;
  box-shadow: 0 8px 24px -4px rgba(245, 158, 11, 0.4);
}

.button-primary:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 8px -2px rgba(245, 158, 11, 0.3);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

---

## 4. Keyboard Navigation & ARIA Patterns

All interactive elements must be 100% operable via keyboard alone.

### Roving `tabindex` Pattern for Toolbars and Menus

```javascript
export function setupRovingTabindex(containerEl, itemSelector) {
  const items = Array.from(containerEl.querySelectorAll(itemSelector));
  if (items.length === 0) return;

  let currentIndex = 0;

  function updateTabs(newIndex) {
    items[currentIndex].setAttribute('tabindex', '-1');
    items[currentIndex].setAttribute('aria-selected', 'false');

    currentIndex = newIndex;
    items[currentIndex].setAttribute('tabindex', '0');
    items[currentIndex].setAttribute('aria-selected', 'true');
    items[currentIndex].focus();
  }

  containerEl.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        updateTabs((currentIndex + 1) % items.length);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        updateTabs((currentIndex - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        updateTabs(0);
        break;
      case 'End':
        e.preventDefault();
        updateTabs(items.length - 1);
        break;
    }
  });

  // Initialize
  items.forEach((item, idx) => {
    item.setAttribute('tabindex', idx === 0 ? '0' : '-1');
    item.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
  });
}
```

### Accessible Modal Dialog Focus Trapping
Modals must capture Tab focus and prevent cycling behind the backdrop:
```javascript
export function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return () => {};

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleKeydown(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') {
      modalEl.dispatchEvent(new CustomEvent('close-modal'));
    }
  }

  modalEl.addEventListener('keydown', handleKeydown);
  first.focus();

  return () => modalEl.removeEventListener('keydown', handleKeydown);
}
```

---

## 5. Design System Verification Checklist

- [ ] Every margin and padding adheres strictly to `--space-1` through `--space-32`.
- [ ] Text contrast ratios satisfy WCAG AA (≥ 4.5:1 for body text).
- [ ] `:focus-visible` styles are explicitly declared and visible on all interactive elements.
- [ ] Micro-interactions utilize `--ease-spring` (`cubic-bezier(0.16, 1, 0.3, 1)`).
- [ ] Menus and lists implement roving `tabindex` with Arrow key navigation.
- [ ] Modals lock scroll on the body and trap focus within container boundaries.
