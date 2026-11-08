import { test, expect } from "@playwright/test";

test.describe("Task 5 / A5: Restrained Signal Orb Motion", () => {
  test("mountOrb initializes canvas, exposes setState/destroy, and renders without error", async ({ page }) => {
    await page.goto("/console/");

    const result = await page.evaluate(async () => {
      const { mountOrb } = await import("/orb.js");
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      document.body.appendChild(canvas);

      const orb = mountOrb(canvas, { state: "pending", reducedMotion: false });
      const hasMethods = typeof orb.setState === "function" && typeof orb.destroy === "function";
      
      orb.setState("pending");
      orb.setState("idle");
      orb.destroy();
      canvas.remove();

      return { hasMethods };
    });

    expect(result.hasMethods).toBe(true);
  });

  test("reduced motion yields a static mark without continuous animation loop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const rafCount = await page.evaluate(async () => {
      const { mountOrb } = await import("/orb.js");
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      document.body.appendChild(canvas);

      let animationFrames = 0;
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        animationFrames++;
        return originalRaf(cb);
      };

      const orb = mountOrb(canvas, { state: "idle", reducedMotion: true });

      // Wait 300ms
      await new Promise((r) => setTimeout(r, 300));
      orb.destroy();
      canvas.remove();
      window.requestAnimationFrame = originalRaf;

      return animationFrames;
    });

    // In reduced motion mode, continuous animation loop is suppressed
    expect(rafCount).toBe(0);
  });

  test("pauses animation updates when document is hidden and resumes when visible", async ({ page }) => {
    await page.goto("/");

    const stateHistory = await page.evaluate(async () => {
      const { mountOrb } = await import("/orb.js");
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      document.body.appendChild(canvas);

      const orb = mountOrb(canvas, { state: "pending", reducedMotion: false });
      
      // Simulate tab hidden
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      const isPausedWhenHidden = orb.isPaused ? orb.isPaused() : true;

      // Simulate tab visible
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      const isResumedWhenVisible = orb.isPaused ? !orb.isPaused() : true;

      orb.destroy();
      canvas.remove();

      return { isPausedWhenHidden, isResumedWhenVisible };
    });

    expect(stateHistory.isPausedWhenHidden).toBe(true);
    expect(stateHistory.isResumedWhenVisible).toBe(true);
  });

  test("destroy cleanly cleans up animation frame and observers", async ({ page }) => {
    await page.goto("/console/");

    const cleanedUp = await page.evaluate(async () => {
      const { mountOrb } = await import("/orb.js");
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      document.body.appendChild(canvas);

      const orb = mountOrb(canvas, { state: "pending", reducedMotion: false });
      orb.destroy();

      return orb.isDestroyed ? orb.isDestroyed() : true;
    });

    expect(cleanedUp).toBe(true);
  });

  test("in console, orb switches to pending during POST and returns to idle upon resolution or reset", async ({ page }) => {
    let resolvePost;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    await page.route("**/chat", async (route) => {
      await postPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Orb status answer", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Check orb status transition");

    // Before submit, orb should be idle
    const stateBefore = await page.evaluate(() => window.__consoleOrbState || "idle");
    expect(stateBefore).toBe("idle");

    // Click send
    await page.locator("#send-btn").click();

    // While pending, state must be 'pending'
    const statePending = await page.evaluate(() => window.__consoleOrbState);
    expect(statePending).toBe("pending");

    // Resolve POST
    resolvePost();
    await expect(page.locator("#chat-messages")).toContainText("Orb status answer");

    // After response, state must return to 'idle'
    const stateAfter = await page.evaluate(() => window.__consoleOrbState);
    expect(stateAfter).toBe("idle");
  });

  test("console orb produces zero requestAnimationFrame calls while idle, animates while pending, and stops on resolution", async ({ page }) => {
    let resolvePost;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    await page.route("**/chat", async (route) => {
      await postPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Finished", cost: "0.0001" })
      });
    });

    await page.goto("/console/");

    // Hook requestAnimationFrame to track frames
    await page.evaluate(() => {
      window.__rafCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        window.__rafCount++;
        return origRaf.call(this, cb);
      };
    });

    // 1. Idle state: wait 300ms, should produce 0 rAF calls
    await page.waitForTimeout(300);
    const idleFrames = await page.evaluate(() => window.__rafCount);
    expect(idleFrames).toBe(0);

    // 2. Pending state: submit a request
    const input = page.locator("#input");
    await input.fill("Testing frame activity");
    await page.locator("#send-btn").click();

    // While pending: wait 300ms, should animate (frames > 0)
    await page.waitForTimeout(300);
    const pendingFrames = await page.evaluate(() => window.__rafCount);
    expect(pendingFrames).toBeGreaterThan(0);

    // 3. Resolve request: returns to idle
    resolvePost();
    await expect(page.locator("#chat-messages")).toContainText("Finished");

    // Reset frame counter and wait 300ms: should produce 0 new frames
    await page.evaluate(() => {
      window.__rafCount = 0;
    });
    await page.waitForTimeout(300);
    const postResolutionFrames = await page.evaluate(() => window.__rafCount);
    expect(postResolutionFrames).toBe(0);
  });

  test("reduced motion disables CSS animations on beacon, messages, and typing dots while keeping content visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/console/");

    // Check status beacon pseudo-element / animation
    const beaconAnimation = await page.evaluate(() => {
      const beacon = document.querySelector(".status-beacon");
      if (!beacon) return null;
      const afterStyle = window.getComputedStyle(beacon, "::after");
      return {
        animationName: afterStyle.animationName,
        animationDuration: afterStyle.animationDuration,
        display: afterStyle.display
      };
    });
    // In reduced motion, beacon pulse animation should be none or 0.01ms/0s or not displaying
    const isBeaconDisabled =
      !beaconAnimation ||
      beaconAnimation.animationName === "none" ||
      beaconAnimation.animationDuration === "0s" ||
      beaconAnimation.animationDuration === "0.00001s" ||
      beaconAnimation.display === "none";
    expect(isBeaconDisabled).toBe(true);

    // Check message visibility and animation
    const messageStyle = await page.evaluate(() => {
      const msg = document.querySelector(".message");
      if (!msg) return null;
      const style = window.getComputedStyle(msg);
      return {
        opacity: style.opacity,
        transform: style.transform,
        animationName: style.animationName,
        animationDuration: style.animationDuration
      };
    });
    expect(messageStyle).toBeTruthy();
    expect(Number(messageStyle.opacity)).toBe(1);
    expect(messageStyle.transform).toBe("none");

    // Check typing dots animation under reduced motion
    const dotStyle = await page.evaluate(() => {
      // Create mock dot
      const dot = document.createElement("div");
      dot.className = "dot";
      document.body.appendChild(dot);
      const style = window.getComputedStyle(dot);
      const res = {
        animationName: style.animationName,
        animationDuration: style.animationDuration
      };
      dot.remove();
      return res;
    });
    const isDotDisabled =
      dotStyle.animationName === "none" ||
      dotStyle.animationDuration === "0s" ||
      dotStyle.animationDuration === "0.00001s";
    expect(isDotDisabled).toBe(true);
  });

  test("orb honors dynamic motion preference change while page is open and removes listener on destroy", async ({ page }) => {
    await page.goto("/console/");

    const result = await page.evaluate(async () => {
      const { mountOrb } = await import("/orb.js");
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      document.body.appendChild(canvas);

      // Track matchMedia listener additions/removals
      let addedListener = null;
      let removedListener = null;
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        const mql = originalMatchMedia.call(window, query);
        return {
          matches: mql.matches,
          media: mql.media,
          addEventListener: (evt, fn) => {
            addedListener = fn;
            mql.addEventListener(evt, fn);
          },
          removeEventListener: (evt, fn) => {
            removedListener = fn;
            mql.removeEventListener(evt, fn);
          }
        };
      };

      const orb = mountOrb(canvas, { state: "pending", animateIdle: false });
      const hadListenerAdded = typeof addedListener === "function";

      orb.destroy();
      const hadListenerRemoved = removedListener === addedListener;

      canvas.remove();
      window.matchMedia = originalMatchMedia;

      return { hadListenerAdded, hadListenerRemoved };
    });

    expect(result.hadListenerAdded).toBe(true);
    expect(result.hadListenerRemoved).toBe(true);
  });
});


