// ==========================================================================
// SupportGeniusAI Signal Desk Orb Component (Canvas2D)
// Derived from Thinking Orbs reference architecture (MIT Licensed)
// Strict Canvas2D • Capped DPR • Pause when Offscreen/Hidden • Shared Motion Policy
// Supported States: 'idle' | 'pending' | 'settling' | 'error' | 'recovery'
// Governed by Task 08 & docs/design-v3/design-enhancements.md
// ==========================================================================

import { isMotionAllowed, subscribeMotionPreference } from "./marketing/motion-policy.js";

/**
 * Mounts a restrained Signal Orb on a target HTMLCanvasElement.
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @param {'idle' | 'pending' | 'settling' | 'error' | 'recovery'} [options.state='idle']
 * @param {boolean} [options.reducedMotion]
 * @param {boolean} [options.animateIdle=false]
 * @returns {{ setState: (newState: string) => void, getState: () => string, destroy: () => void, isPaused: () => boolean, isDestroyed: () => boolean }}
 */
export function mountOrb(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== "function") {
    return {
      setState() {},
      getState: () => "idle",
      destroy() {},
      isPaused: () => true,
      isDestroyed: () => true
    };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      setState() {},
      getState: () => "idle",
      destroy() {},
      isPaused: () => true,
      isDestroyed: () => true
    };
  }

  let currentState = options.state || "idle";
  const animateIdle = Boolean(options.animateIdle);

  const motionQuery =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  // Determine motion permission: explicit option > shared motion policy (reduced motion + user pause)
  let motionAllowed = true;
  try {
    motionAllowed = isMotionAllowed();
  } catch {
    motionAllowed = motionQuery ? !motionQuery.matches : true;
  }

  let reducedMotion =
    options.reducedMotion !== undefined
      ? Boolean(options.reducedMotion)
      : !motionAllowed;

  let destroyed = false;
  let paused = false;
  let isIntersecting = true;
  let isDocVisible = typeof document !== "undefined" ? !document.hidden : true;
  let rafId = null;
  let startTime = performance.now();
  let settleStartTime = 0;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = canvas.width || 64;
  let height = canvas.height || 64;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width > 0 ? rect.width : (canvas.width || 64);
    const displayHeight = rect.height > 0 ? rect.height : (canvas.height || 64);

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }
    width = canvas.width;
    height = canvas.height;
  }

  resize();

  function drawStaticMark() {
    resize();
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(cx, cy) * 0.85;

    ctx.clearRect(0, 0, width, height);

    // Outer boundary ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.strokeStyle = "#26262a";
    ctx.lineWidth = 1.2 * dpr;
    if (currentState === "recovery") {
      ctx.setLineDash([3 * dpr, 3 * dpr]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Signal ring (accent)
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.65, 0, Math.PI * 2);
    if (currentState === "pending" || currentState === "error") {
      ctx.strokeStyle = "#BB1729";
    } else if (currentState === "recovery") {
      ctx.strokeStyle = "#E06C75";
    } else {
      ctx.strokeStyle = "#38080F";
    }
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();

    // Core point
    ctx.beginPath();
    const coreR = (currentState === "pending" || currentState === "error") ? 3.2 * dpr : 2.5 * dpr;
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    if (currentState === "pending" || currentState === "error") {
      ctx.fillStyle = "#BB1729";
    } else if (currentState === "recovery") {
      ctx.fillStyle = "#E06C75";
    } else {
      ctx.fillStyle = "#F7F7F5";
    }
    ctx.fill();
  }

  function render(now) {
    if (destroyed || paused) return;

    // Check bounded settle phase (<= 250ms)
    if (currentState === "settling") {
      const elapsedSettle = now - settleStartTime;
      if (elapsedSettle >= 200) {
        currentState = "idle";
        updateRunningState();
        return;
      }
    }

    const elapsed = (now - startTime) / 1000;
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(cx, cy) * 0.82;

    ctx.clearRect(0, 0, width, height);

    // Speed and pulsing based on state
    const isSettling = (currentState === "settling");
    const settleProgress = isSettling ? Math.min((now - settleStartTime) / 200, 1.0) : 0;
    const speed = isSettling ? (2.5 * (1.0 - settleProgress * 0.75)) : (currentState === "pending" ? 2.5 : 0.8);
    const t = elapsed * speed;

    // Outer dashed perimeter
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.strokeStyle = "#26262a";
    ctx.lineWidth = 1.2 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.stroke();
    ctx.restore();

    // Inner orbiting signal node
    const orbitR = baseR * (currentState === "pending" ? 0.68 + Math.sin(t * 3) * 0.05 : 0.65 * (1.0 - settleProgress * 0.2));
    const nodeAngle = t * 1.4;
    const nx = cx + Math.cos(nodeAngle) * orbitR;
    const ny = cy + Math.sin(nodeAngle) * orbitR;

    // Connecting axis line
    const axisAlpha = isSettling ? Math.max(0, 0.45 * (1.0 - settleProgress)) : (currentState === "pending" ? 0.45 : 0.2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = `rgba(187, 23, 41, ${axisAlpha})`;
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Orbit ring
    const ringAlpha = isSettling ? Math.max(0.12, 0.25 * (1.0 - settleProgress * 0.5)) : (currentState === "pending" ? 0.25 : 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(187, 23, 41, ${ringAlpha})`;
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Orbiting node
    if (!isSettling || settleProgress < 0.85) {
      const nodeAlpha = isSettling ? (1.0 - settleProgress) : 1.0;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.5 * dpr * (1.0 - settleProgress * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(187, 23, 41, ${nodeAlpha})`;
      ctx.fill();
    }

    // Core point
    const corePulse = isSettling
      ? (3.5 * (1.0 - settleProgress) + 2.5 * settleProgress) * dpr
      : (currentState === "pending" ? (3.5 + Math.sin(t * 4) * 0.8) * dpr : 2.5 * dpr);
    ctx.beginPath();
    ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
    if (isSettling) {
      // Transition from crimson to warm-white
      ctx.fillStyle = settleProgress > 0.5 ? "#F7F7F5" : "#BB1729";
    } else {
      ctx.fillStyle = currentState === "pending" ? "#BB1729" : "#F7F7F5";
    }
    ctx.fill();

    rafId = requestAnimationFrame(render);
  }

  function updateRunningState() {
    if (reducedMotion) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      paused = true;
      drawStaticMark();
      return;
    }

    const shouldAnimate =
      !destroyed &&
      isDocVisible &&
      isIntersecting &&
      (animateIdle || currentState === "pending" || currentState === "settling");

    if (shouldAnimate) {
      if (paused || !rafId) {
        paused = false;
        rafId = requestAnimationFrame(render);
      }
    } else {
      paused = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      drawStaticMark();
    }
  }

  // Dynamic prefers-reduced-motion listener
  function onMotionChange(e) {
    if (options.reducedMotion === undefined) {
      try {
        reducedMotion = !isMotionAllowed();
      } catch {
        reducedMotion = Boolean(e.matches);
      }
      updateRunningState();
    }
  }

  if (motionQuery && typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", onMotionChange);
  }

  // Dynamic shared motion preference subscriber (e.g. user toggles Pause animations on marketing page)
  let unsubscribeMotion = null;
  try {
    unsubscribeMotion = subscribeMotionPreference((allowed) => {
      if (options.reducedMotion === undefined) {
        reducedMotion = !allowed;
        updateRunningState();
      }
    });
  } catch {}

  // IntersectionObserver to pause when offscreen
  let observer = null;
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersecting = entry ? entry.isIntersecting : true;
        updateRunningState();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
  }

  // VisibilityChange listener to pause when backgrounded
  function onVisibilityChange() {
    isDocVisible = typeof document !== "undefined" ? !document.hidden : true;
    updateRunningState();
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  // Initialize
  updateRunningState();

  return {
    setState(newState) {
      if (destroyed) return;
      if (newState === "settling") {
        if (reducedMotion) {
          currentState = "idle";
          updateRunningState();
          return;
        }
        settleStartTime = performance.now();
        currentState = "settling";
        updateRunningState();
        return;
      }
      currentState = newState;
      updateRunningState();
    },
    getState() {
      return currentState;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      paused = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (motionQuery && typeof motionQuery.removeEventListener === "function") {
        motionQuery.removeEventListener("change", onMotionChange);
      }
      if (typeof unsubscribeMotion === "function") {
        unsubscribeMotion();
        unsubscribeMotion = null;
      }
    },
    isPaused() {
      return paused;
    },
    isDestroyed() {
      return destroyed;
    }
  };
}
