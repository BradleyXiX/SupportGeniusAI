---
name: gsap-motion
description: Production-grade animation and scroll choreography using GSAP, ScrollTrigger, and Lenis smooth scrolling with mandatory lifecycle cleanup.
---

# GSAP Motion Choreography & Lifecycle Standards

The `gsap-motion` skill enforces high-fidelity, silky-smooth animations across SupportGeniusAI. Motion must serve information hierarchy and narrative storytelling rather than superfluous distraction. Every animation must be hardware-accelerated, responsive, and completely isolated from memory leaks.

---

## 1. Lenis Smooth Scroll Synchronized with GSAP Ticker

To achieve synchronized, jank-free scroll animations without duplicate render loops, **Lenis** must drive smooth scrolling and delegate its animation frames directly to the **GSAP ticker**.

### Single Source of Truth Ticker Integration

```javascript
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initializeSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 2,
  });

  // Synchronize Lenis scroll updates with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Bind Lenis animation frame execution to GSAP's optimized ticker
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Eliminate lag smoothing to maintain lock-step synchronization
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
```

---

## 2. Mandatory Scoped Lifecycle Cleanup

Uncontrolled GSAP animations cause severe memory leaks, orphaned ScrollTrigger instances, ghost triggers, and unpredictable behavior across component re-renders and Hot Module Replacements (HMR).

### Rule: Always Scope via `useGSAP()` or `gsap.context()`

#### React Implementation Pattern (`@gsap/react`)
```jsx
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function FeatureShowcase() {
  const containerRef = useRef(null);

  useGSAP(() => {
    // All selectors within this scope are automatically scoped to containerRef
    gsap.from('.feature-card', {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
      },
    });
  }, { scope: containerRef }); // Automatic teardown and context reversion on unmount

  return (
    <div ref={containerRef} className="showcase-container">
      <div className="feature-card">Card 1</div>
      <div className="feature-card">Card 2</div>
      <div className="feature-card">Card 3</div>
    </div>
  );
}
```

#### Vanilla JavaScript / Framework-Agnostic Context Pattern
```javascript
export class AnimatedSection {
  constructor(element) {
    this.root = element;
    this.ctx = null;
    this.init();
  }

  init() {
    // Encapsulate all animations inside a dedicated context
    this.ctx = gsap.context(() => {
      gsap.to('.hero-headline', {
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        y: 0,
        duration: 1.1,
        ease: 'power4.out',
      });
    }, this.root);
  }

  destroy() {
    // Reverts all animations, kills ScrollTriggers, and purges event listeners
    if (this.ctx) {
      this.ctx.revert();
      this.ctx = null;
    }
  }
}
```

---

## 3. Scroll-Scrubbed Timelines & Pinning

For complex product explanations, feature reveals, and interactive storytelling, implement scroll-scrubbed timelines with section pinning.

### Multi-Card Storytelling Pattern (`scrub: 1`, `pin: true`)

```javascript
export function setupPinnedStorytelling(sectionEl, cards) {
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionEl,
        start: 'top top',
        end: `+=${cards.length * 100}%`,
        pin: true,
        pinSpacing: true,
        scrub: 1, // 1-second lag smoothing for buttery feedback
        anticipatePin: 1,
      },
    });

    cards.forEach((card, index) => {
      if (index === 0) return; // First card starts active

      tl.to(cards[index - 1], {
        scale: 0.92,
        opacity: 0.4,
        y: -30,
        duration: 1,
        ease: 'none',
      }, `step-${index}`)
      .fromTo(card, 
        { yPercent: 120, opacity: 0, scale: 0.95 },
        { yPercent: 0, opacity: 1, scale: 1, duration: 1, ease: 'none' },
        `step-${index}`
      );
    });
  }, sectionEl);

  return ctx;
}
```

---

## 4. Performance & Hardware Acceleration Mandates

1. **Only Animate Composite Properties**:
   - Limit animations exclusively to `transform` (`x`, `y`, `scale`, `rotation`) and `opacity`.
   - Never animate `top`, `left`, `margin`, `width`, or `height` unless dynamically calculating container bounds.
2. **Force GPU Layer Creation**:
   - Utilize `will-change: transform` or `force3D: true` on critical animated elements during active animations.
3. **Respect Reduced Motion**:
   Always honor system accessibility preferences:
   ```javascript
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (prefersReducedMotion) {
     gsap.set(elements, { opacity: 1, y: 0, scale: 1 });
     return;
   }
   ```

---

## 5. Pre-Commit Animation Checklist

- [ ] Lenis tick is handled via `gsap.ticker.add((time) => lenis.raf(time * 1000))` with `lagSmoothing(0)`.
- [ ] Every React GSAP sequence uses `useGSAP()` or explicit `gsap.context()` cleanup.
- [ ] No raw DOM elements are animated outside a scoped root container.
- [ ] Pinned sections have explicit `anticipatePin: 1` to prevent visual jitter.
- [ ] Scrubbed timelines specify numeric damping (e.g., `scrub: 1` or `scrub: 0.8`), not boolean `true`.
- [ ] `prefers-reduced-motion` check is implemented for all cinematic transitions.
