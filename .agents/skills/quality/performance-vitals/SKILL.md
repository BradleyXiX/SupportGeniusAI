---
name: performance-vitals
description: Core Web Vitals optimization framework enforcing sub-second LCP, sub-200ms INP, zero CLS, dynamic code splitting, and bundle size monitoring.
---

# Performance Vitals & Bundle Optimization Standards

The `performance-vitals` skill guarantees that SupportGeniusAI delivers lightning-fast, aerodynamically tuned web applications. We treat Core Web Vitals (CWV) not as vanity benchmarks, but as fundamental usability contracts.

---

## 1. Core Web Vitals (CWV) Budgets & Hard Limits

Every deployable frontend experience must comply with Google's Core Web Vitals thresholds measured at the 75th percentile of real-user telemetry (CrUX).

| Metric | Target Budget | Engineering Mitigation |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | `< 2.5s` (Ideal: `< 1.2s`) | Preload hero resources, inline critical CSS, self-host optimized fonts. |
| **INP (Interaction to Next Paint)** | `< 200ms` (Ideal: `< 80ms`) | Break up long tasks (>50ms) using `scheduler.yield()`, debounce heavy inputs. |
| **CLS (Cumulative Layout Shift)** | `< 0.1` (Ideal: `0.0`) | Explicit `aspect-ratio` on all media/containers, fixed-height skeletons. |

---

## 2. Largest Contentful Paint (LCP) Optimization

LCP is typically dominated by hero images, banners, or primary typographical headings.

### Architectural Rules for Fast LCP
1. **Preload Critical Hero Media**:
   Always place `<link rel="preload">` in the document `<head>` for the hero image with high fetch priority:
   ```html
   <link 
     rel="preload" 
     as="image" 
     href="/images/hero-dashboard.webp" 
     type="image/webp" 
     fetchpriority="high"
   />
   ```
2. **Font Loading Strategy**:
   Prevent Flash of Invisible Text (FOIT) using `font-display: swap` and preloading font files:
   ```html
   <link 
     rel="preload" 
     href="/fonts/cabinet-grotesk.woff2" 
     as="font" 
     type="font/woff2" 
     crossorigin 
   />
   ```
3. **Critical Path CSS Inlining**:
   Inline critical above-the-fold CSS tokens directly in `<style>` tags to eliminate blocking network roundtrips.

---

## 3. Interaction to Next Paint (INP) & Main-Thread Yielding

Long-running JavaScript execution blocks the main browser thread, preventing immediate visual feedback when users click or type.

### Task Slicing with `scheduler.yield()`

When processing large datasets, token streams, or heavy filtering logic:

```javascript
export async function processLargeDatasetInSlices(items, processItem) {
  const CHUNK_SIZE = 50;

  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield back to the browser main thread every CHUNK_SIZE items
    if (i % CHUNK_SIZE === 0 && i > 0) {
      if ('scheduler' in window && 'yield' in window.scheduler) {
        await window.scheduler.yield();
      } else {
        // Fallback for browsers lacking native scheduler.yield()
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
}
```

---

## 4. Cumulative Layout Shift (CLS) Prevention

Visual jitter destroys user confidence and triggers accidental mis-clicks.

### Layout Reservation Patterns
1. **Explicit Dimensions and Aspect Ratios**:
   Never inject media or dynamic containers without fixed aspect ratios or reserved dimensions:
   ```css
   .dashboard-preview-container {
     width: 100%;
     aspect-ratio: 16 / 9;
     background-color: var(--surface-card); /* Placeholder surface prevents blank shifts */
   }
   ```
2. **Fixed-Height Skeleton Screens**:
   Async components must render skeleton screens matching the exact bounding geometry of loaded data:
   ```css
   .skeleton-card {
     height: 180px;
     border-radius: var(--radius-lg);
     background: linear-gradient(
       90deg,
       var(--surface-card) 25%,
       var(--surface-hover) 50%,
       var(--surface-card) 75%
     );
     background-size: 200% 100%;
     animation: skeleton-shimmer 1.5s infinite;
   }
   ```

---

## 5. Dynamic Code Splitting & Bundle Limits

Initial page loads must never download monolithic JavaScript bundles.

### Route-Level & Component-Level Lazy Loading

```jsx
import React, { Suspense, lazy } from 'react';

// Lazy load heavy graphical, chart, or 3D modules
const AnalyticsChart = lazy(() => import('./components/AnalyticsChart.jsx'));
const ThreeScene = lazy(() => import('./components/ThreeScene.jsx'));

export function InsightsView() {
  return (
    <div className="insights-view">
      <h1>Operational Intelligence</h1>
      <Suspense fallback={<div className="skeleton-card" style={{ height: 400 }} />}>
        <AnalyticsChart />
        <ThreeScene />
      </Suspense>
    </div>
  );
}
```

### Bundle Size Budget Policy
- **Initial JS Bundle Size**: `< 150 KB (gzipped)`
- **Dynamic Chunks**: `< 50 KB (gzipped)` each
- Enforce in Vite/Webpack build steps:
  ```javascript
  // vite.config.js snippet
  export default {
    build: {
      chunkSizeWarningLimit: 300, // Warn if any chunk exceeds 300KB uncompressed
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            animation: ['gsap', '@studio-freight/lenis'],
            three: ['three'],
          },
        },
      },
    },
  };
  ```

---

## 6. Performance Vitals Checklist

- [ ] LCP hero image preloaded with `fetchpriority="high"`.
- [ ] Font files use WOFF2 with `font-display: swap` and preloading.
- [ ] Heavy iterative loops slice execution with `scheduler.yield()`.
- [ ] All images, videos, and dynamic embeds declare explicit `aspect-ratio` or `width`/`height`.
- [ ] Heavy components (charts, 3D, rich editors) are dynamically imported via `React.lazy()`.
- [ ] Initial bundle size stays within the 150 KB gzipped budget.
