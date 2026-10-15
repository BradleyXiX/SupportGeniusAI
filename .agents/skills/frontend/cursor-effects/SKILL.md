---
name: cursor-effects
description: Fluid, non-blocking pointer interactions, magnetic proximity attraction, and particle repulsion using gsap.quickTo without React re-renders.
---

# High-Performance Cursor Effects & Magnetic Proximity

The `cursor-effects` skill governs interactive pointer behavior across SupportGeniusAI. Pointer effects must feel natural, physical, and weightless. They must **never** trigger layout reflows or React state re-renders during mouse movements.

---

## 1. Fluid Non-Blocking Cursors via `gsap.quickTo`

Traditional custom cursors that update React state on `mousemove` or directly mutate DOM inline styles on every event trigger massive main-thread bottlenecks. We mandate `gsap.quickTo` to bypass component re-renders and utilize hardware-accelerated transforms.

### Production Implementation

```javascript
import gsap from 'gsap';

export function initializeFluidCursor(dotEl, ringEl) {
  // Graceful degradation for touch devices and reduced motion
  if (window.matchMedia('(pointer: coarse)').matches) return { cleanup: () => {} };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { cleanup: () => {} };

  // Set initial transforms to center point
  gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50 });

  // Instant snap for the inner dot
  const dotX = gsap.quickTo(dotEl, 'x', { duration: 0.08, ease: 'power2.out' });
  const dotY = gsap.quickTo(dotEl, 'y', { duration: 0.08, ease: 'power2.out' });

  // Elastic physics lag for the outer ring
  const ringX = gsap.quickTo(ringEl, 'x', { duration: 0.35, ease: 'power3.out' });
  const ringY = gsap.quickTo(ringEl, 'y', { duration: 0.35, ease: 'power3.out' });

  function onPointerMove(e) {
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  return {
    cleanup: () => {
      window.removeEventListener('pointermove', onPointerMove);
    }
  };
}
```

---

## 2. Magnetic Proximity Attraction on Interactive Elements

Buttons, badges, and primary interactive nodes must exert magnetic pull when the cursor enters their proximity threshold (typically 40–80px).

### Proximity Vector Calculation

```javascript
import gsap from 'gsap';

export function attachMagneticEffect(buttonElement, magneticRadius = 60, pullStrength = 0.35) {
  const rect = () => buttonElement.getBoundingClientRect();
  const xTo = gsap.quickTo(buttonElement, 'x', { duration: 0.4, ease: 'power3.out' });
  const yTo = gsap.quickTo(buttonElement, 'y', { duration: 0.4, ease: 'power3.out' });

  function onMouseMove(e) {
    const b = rect();
    const centerX = b.left + b.width / 2;
    const centerY = b.top + b.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    // Apply attraction within threshold
    if (distance < magneticRadius) {
      xTo(dx * pullStrength);
      yTo(dy * pullStrength);
    } else {
      // Spring back to rest
      xTo(0);
      yTo(0);
    }
  }

  function onMouseLeave() {
    xTo(0);
    yTo(0);
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  buttonElement.addEventListener('mouseleave', onMouseLeave);

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    buttonElement.removeEventListener('mouseleave', onMouseLeave);
  };
}
```

---

## 3. Cursor Particle Repulsion Physics

When rendering interactive background particle grids, particles must calculate Euclidean distance to the pointer and smoothly disperse away from the cursor radius.

```javascript
export class ParticleRepulsionCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.cursor = { x: -9999, y: -9999, radius: 100 };
    this.animationId = null;
    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.loop();
  }

  createParticles() {
    const spacing = 35;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      for (let y = 0; y < this.canvas.height; y += spacing) {
        this.particles.push({
          originX: x,
          originY: y,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          color: 'rgba(148, 163, 184, 0.25)',
        });
      }
    }
  }

  bindEvents() {
    this.onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.cursor.x = e.clientX - rect.left;
      this.cursor.y = e.clientY - rect.top;
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      const dx = this.cursor.x - p.x;
      const dy = this.cursor.y - p.y;
      const distance = Math.hypot(dx, dy);

      // Repulsion force inversely proportional to distance
      if (distance < this.cursor.radius && distance > 0) {
        const force = (this.cursor.radius - distance) / this.cursor.radius;
        const angle = Math.atan2(dy, dx);
        p.vx -= Math.cos(angle) * force * 4;
        p.vy -= Math.sin(angle) * force * 4;
      }

      // Spring force returning particle to origin
      p.vx += (p.originX - p.x) * 0.08;
      p.vy += (p.originY - p.y) * 0.08;

      // Friction damping
      p.vx *= 0.85;
      p.vy *= 0.85;

      p.x += p.vx;
      p.y += p.vy;

      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('pointermove', this.onMove);
  }
}
```

---

## 4. Cursor Verification Checklist

- [ ] Mobile/touch devices automatically disable custom cursors (`@media (pointer: coarse)`).
- [ ] Pointer updates strictly invoke `gsap.quickTo` instead of React `useState` hooks.
- [ ] Magnetic attraction bounds check uses `Math.hypot(dx, dy)` and resets with spring physics on boundary exit.
- [ ] Canvas particles calculate velocity decay and spring damping towards home coordinates.
- [ ] All event listeners have matching unbind calls in cleanup handlers.
