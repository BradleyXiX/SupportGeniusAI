// ==========================================================================
// SupportGeniusAI Bounded Atmospheric Network Texture
// Strict CSP • 20-24fps Update Cap • Bounded Points & Links • Shared Policy
// Governed by Task 06 & docs/design-v3/design-enhancements.md
// ==========================================================================

import {
  isMotionAllowed,
  isReducedMotionPreferred,
  subscribeMotionPreference
} from './motion-policy.js';

// Global coordination: prioritize primary large sphere when active in viewport
let largeSphereActive = false;
const coordinationListeners = new Set();

export function setLargeSphereActive(active) {
  largeSphereActive = Boolean(active);
  coordinationListeners.forEach((fn) => {
    try { fn(largeSphereActive); } catch {}
  });
}

export function isLargeSphereActive() {
  return largeSphereActive;
}

export function initNetworkTexture(backdropEl) {
  if (!backdropEl) return null;

  const canvas = backdropEl.querySelector('canvas.network-canvas');
  const poster = backdropEl.querySelector('.network-poster');
  if (!canvas) return null;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  let raf = 0;
  let disposed = false;
  let isIntersecting = false;
  let isDocVisible = !document.hidden;
  let isGlobalMotionAllowed = isMotionAllowed();
  let lastFrameTime = 0;

  // Cached dimensions — eliminates layout measurement in animation loop
  let cachedWidth = 0;
  let cachedHeight = 0;
  let cachedDpr = 1;
  let pointCount = 0;
  let linkCount = 0;
  let points = [];

  // Bounded limits per specification
  const TARGET_FPS = 22; // 20-24 fps cap
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  function configureTiers() {
    const isPhone = window.innerWidth <= 760;
    const maxPoints = isPhone ? 16 : 32;
    const maxLinks = isPhone ? 20 : 48;
    const maxRadius = isPhone ? 70 : 90;

    return { maxPoints, maxLinks, maxRadius };
  }

  function updateDimensions(rect) {
    if (rect) {
      cachedWidth = Math.floor(rect.width);
      cachedHeight = Math.floor(rect.height);
    } else {
      const r = backdropEl.getBoundingClientRect();
      cachedWidth = Math.floor(r.width);
      cachedHeight = Math.floor(r.height);
    }

    cachedDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(cachedWidth * cachedDpr);
    const h = Math.round(cachedHeight * cachedDpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    initPoints();
  }

  function initPoints() {
    const { maxPoints } = configureTiers();
    points = [];
    const w = cachedWidth || 300;
    const h = cachedHeight || 300;

    for (let i = 0; i < maxPoints; i++) {
      points.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 14, // slow bounded drift (px/sec)
        vy: (Math.random() - 0.5) * 14,
        radius: (i % 5 === 0) ? 2.0 : 1.5,
        isCore: (i < 3) // 3 subtle warm-white spark points
      });
    }
    pointCount = points.length;
  }

  function shouldRun() {
    return (
      !disposed &&
      isGlobalMotionAllowed &&
      !isReducedMotionPreferred() &&
      isDocVisible &&
      isIntersecting &&
      !largeSphereActive
    );
  }

  function draw() {
    if (!shouldRun()) {
      if (canvas && !canvas.hidden) {
        canvas.hidden = true;
      }
      if (poster) {
        poster.style.visibility = 'visible';
      }
      return;
    }

    if (canvas.hidden) {
      canvas.hidden = false;
      if (poster) poster.style.visibility = 'hidden';
    }

    const { maxLinks, maxRadius } = configureTiers();
    const w = cachedWidth;
    const h = cachedHeight;
    const dpr = cachedDpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const dt = FRAME_INTERVAL / 1000;

    // Update positions with wrap-around
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) p.x += w;
      if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y -= h;
    }

    // Draw bounded links with capped neighbor count and maximum connection radius
    let currentLinks = 0;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let i = 0; i < points.length; i++) {
      if (currentLinks >= maxLinks) break;
      let neighborsForPoint = 0;
      const p1 = points[i];

      for (let j = i + 1; j < points.length; j++) {
        if (currentLinks >= maxLinks || neighborsForPoint >= 3) break;
        const p2 = points[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxRadius * maxRadius) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / maxRadius) * 0.32;
          ctx.strokeStyle = `rgba(187, 23, 41, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          neighborsForPoint++;
          currentLinks++;
        }
      }
    }
    linkCount = currentLinks;

    // Draw points
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isCore ? '#F7F7F5' : '#BB1729';
      ctx.fill();
    }

    ctx.restore();
  }

  function step(time) {
    raf = 0;
    if (!shouldRun()) return;

    const elapsed = time - lastFrameTime;
    if (elapsed >= FRAME_INTERVAL) {
      lastFrameTime = time - (elapsed % FRAME_INTERVAL);
      draw();
    }

    raf = requestAnimationFrame(step);
  }

  function schedule() {
    if (shouldRun()) {
      if (!raf) {
        lastFrameTime = performance.now();
        raf = requestAnimationFrame(step);
      }
    } else {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (canvas && !canvas.hidden) {
        canvas.hidden = true;
      }
      if (poster) {
        poster.style.visibility = 'visible';
      }
    }
  }

  // Initial measurements
  updateDimensions();

  // ResizeObserver for dimension caching without layout thrashing
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        updateDimensions(entries[0].contentRect);
      }
      schedule();
    });
    resizeObserver.observe(backdropEl);
  }

  // IntersectionObserver for offscreen pausing
  let intersectionObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver((entries) => {
      isIntersecting = Boolean(entries[0]?.isIntersecting);
      schedule();
    }, { threshold: 0.02 });
    intersectionObserver.observe(backdropEl);
  }

  // Shared motion preference subscription
  const unsubscribeMotion = subscribeMotionPreference((allowed) => {
    isGlobalMotionAllowed = allowed;
    schedule();
  });

  // Coordination with large sphere
  const onCoordinationChange = () => {
    schedule();
  };
  coordinationListeners.add(onCoordinationChange);

  // Tab visibility suspension
  const onVisibilityChange = () => {
    isDocVisible = !document.hidden;
    schedule();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  const onPageHide = () => {
    isDocVisible = false;
    schedule();
  };
  const onPageShow = () => {
    isDocVisible = !document.hidden;
    isGlobalMotionAllowed = isMotionAllowed();
    schedule();
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);

  // Initial schedule evaluation
  schedule();

  return {
    destroy: () => {
      disposed = true;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      unsubscribeMotion();
      coordinationListeners.delete(onCoordinationChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);

      if (canvas) canvas.hidden = true;
      if (poster) poster.style.visibility = 'visible';
    },
    isRunning: () => Boolean(raf && shouldRun()),
    getPointCount: () => pointCount,
    getLinkCount: () => linkCount,
    getTargetFps: () => TARGET_FPS,
    getCanvas: () => canvas
  };
}
