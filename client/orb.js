// ==========================================================================
// SupportGeniusAI Signal Desk Orb Component (Canvas2D)
// Derived from Thinking Orbs reference architecture (MIT Licensed)
// Strict Canvas2D • Capped DPR • Pause when Offscreen/Hidden • Reduced Motion
// ==========================================================================

/**
 * Mounts a restrained Signal Orb on a target HTMLCanvasElement.
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @param {'idle' | 'pending'} [options.state='idle']
 * @param {boolean} [options.reducedMotion]
 * @returns {{ setState: (newState: 'idle' | 'pending') => void, destroy: () => void, isPaused: () => boolean, isDestroyed: () => boolean }}
 */
export function mountOrb(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== "function") {
    return {
      setState() {},
      destroy() {},
      isPaused: () => true,
      isDestroyed: () => true
    };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      setState() {},
      destroy() {},
      isPaused: () => true,
      isDestroyed: () => true
    };
  }

  let currentState = options.state || "idle";
  const reducedMotion =
    options.reducedMotion !== undefined
      ? options.reducedMotion
      : typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let destroyed = false;
  let paused = false;
  let isIntersecting = true;
  let isDocVisible = !document.hidden;
  let rafId = null;
  let startTime = performance.now();

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
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(cx, cy) * 0.85;

    ctx.clearRect(0, 0, width, height);

    // Outer boundary ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.strokeStyle = "#293447";
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Signal ring (accent)
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = currentState === "pending" ? "#F2C572" : "#85D6BD";
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();

    // Core point
    ctx.beginPath();
    ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = currentState === "pending" ? "#F2C572" : "#85D6BD";
    ctx.fill();
  }

  function render(now) {
    if (destroyed || paused) return;

    const elapsed = (now - startTime) / 1000;
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(cx, cy) * 0.82;

    ctx.clearRect(0, 0, width, height);

    // Speed and pulsing based on state
    const speed = currentState === "pending" ? 2.5 : 0.8;
    const t = elapsed * speed;

    // Outer dashed perimeter
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.strokeStyle = "#293447";
    ctx.lineWidth = 1.2 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.stroke();
    ctx.restore();

    // Inner orbiting signal node
    const orbitR = baseR * (currentState === "pending" ? 0.68 + Math.sin(t * 3) * 0.05 : 0.65);
    const nodeAngle = t * (currentState === "pending" ? 1.4 : 0.6);
    const nx = cx + Math.cos(nodeAngle) * orbitR;
    const ny = cy + Math.sin(nodeAngle) * orbitR;

    // Connecting axis line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = currentState === "pending" ? "rgba(242, 197, 114, 0.4)" : "rgba(133, 214, 189, 0.3)";
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Orbit ring
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.strokeStyle = currentState === "pending" ? "rgba(242, 197, 114, 0.25)" : "rgba(133, 214, 189, 0.2)";
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Orbiting node
    ctx.beginPath();
    ctx.arc(nx, ny, 2.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = currentState === "pending" ? "#F2C572" : "#85D6BD";
    ctx.fill();

    // Core point
    const corePulse = currentState === "pending" ? 3.5 + Math.sin(t * 4) * 0.8 : 3;
    ctx.beginPath();
    ctx.arc(cx, cy, corePulse * dpr, 0, Math.PI * 2);
    ctx.fillStyle = currentState === "pending" ? "#F2C572" : "#85D6BD";
    ctx.fill();

    rafId = requestAnimationFrame(render);
  }

  function updateRunningState() {
    if (reducedMotion) {
      drawStaticMark();
      return;
    }

    const shouldRun = !destroyed && isDocVisible && isIntersecting;
    if (shouldRun && paused) {
      paused = false;
      rafId = requestAnimationFrame(render);
    } else if (!shouldRun && !paused) {
      paused = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  }

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
    isDocVisible = !document.hidden;
    updateRunningState();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Initialize
  if (reducedMotion) {
    drawStaticMark();
    paused = true;
  } else {
    paused = false;
    rafId = requestAnimationFrame(render);
  }

  return {
    setState(newState) {
      if (destroyed) return;
      currentState = newState;
      if (reducedMotion) {
        drawStaticMark();
      }
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
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
    isPaused() {
      return paused;
    },
    isDestroyed() {
      return destroyed;
    }
  };
}

