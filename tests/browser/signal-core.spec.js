import { test, expect } from "@playwright/test";

test.describe("Task 04: Signal Core Motion Policy, Lifecycle State Machine & Hover", () => {
  test.afterEach(async ({ page }) => {
    try {
      if (page.url() && !page.url().startsWith("about:")) {
        await page.evaluate(() => {
          try { localStorage.clear(); } catch {}
          try { window.scrollTo(0, 0); } catch {}
        });
      }
    } catch {}
    try {
      await page.emulateMedia({ reducedMotion: "no-preference" });
    } catch {}
  });

  test("1. Default-on auto-start after first paint for eligible visible scene", async ({ page }) => {
    let signalCoreFetched = false;
    page.on("request", (req) => {
      if (req.url().includes("signal-core.js")) {
        signalCoreFetched = true;
      }
    });

    const response = await page.goto("/");
    expect(response.status()).toBe(200);

    const stage = page.locator(".core-stage");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");
    const toggle = page.locator("#motion-toggle");

    // Dynamic import is triggered automatically on idle/first paint
    await expect(canvas).toBeVisible({ timeout: 10000 });
    expect(signalCoreFetched).toBe(true);

    // Toggle button reflects running animation
    await expect(toggle).toHaveText("Pause animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toBeEnabled();

    // Stage reflects running state
    await expect(stage).toHaveAttribute("data-motion-state", "running");

    // Poster is hidden behind canvas
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("hidden");

    // Canvas dimensions conform to DPR-capped bounds
    const canvasDims = await canvas.evaluate((c) => ({
      width: c.width,
      height: c.height,
      hidden: c.hidden
    }));
    expect(canvasDims.hidden).toBe(false);
    expect(canvasDims.width).toBeGreaterThan(0);
    expect(canvasDims.height).toBeGreaterThan(0);
  });

  test("2. Persistent global pause: clicking 'Pause animations' halts WebGL, hides canvas, restores poster, and stores preference", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");
    const stage = page.locator(".core-stage");

    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");

    // Click to pause
    await toggle.click();

    // Toggle transitions to Resume animations
    await expect(toggle).toHaveText("Resume animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(stage).toHaveAttribute("data-motion-state", "user-paused");

    // Canvas hidden, poster restored
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");

    // Preference stored under versioned key
    const stored = await page.evaluate(() => localStorage.getItem("sg_motion_v1"));
    expect(stored).toBe("paused");
  });

  test("3. Pause persistence on page reload: stays paused on first paint without auto-starting", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set stored preference before loading
    await page.addInitScript(() => {
      localStorage.setItem("sg_motion_v1", "paused");
    });

    let signalCoreFetched = false;
    page.on("request", (req) => {
      if (req.url().includes("signal-core.js")) {
        signalCoreFetched = true;
      }
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");
    const stage = page.locator(".core-stage");

    // Waits a beat to ensure auto-start would have triggered if not paused
    await page.waitForTimeout(500);

    // Stays paused: module not imported, poster visible, canvas hidden
    expect(signalCoreFetched).toBe(false);
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();
    await expect(toggle).toHaveText("Resume animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(stage).toHaveAttribute("data-motion-state", "user-paused");
    await context.close();
  });

  test("4. Resuming animations: clicking 'Resume animations' removes pause preference and mounts WebGL", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem("sg_motion_v1", "paused");
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");
    const stage = page.locator(".core-stage");

    await expect(toggle).toHaveText("Resume animations");
    await toggle.click();

    // Module mounted, canvas visible, toggle updated
    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(stage).toHaveAttribute("data-motion-state", "running");

    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("hidden");

    // Preference is cleared/running
    const stored = await page.evaluate(() => localStorage.getItem("sg_motion_v1"));
    expect(stored).not.toBe("paused");
    await context.close();
  });

  test("5. Repeated pause/resume cycles transition cleanly without leaks or stale state", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    await expect(canvas).toBeVisible();

    for (let cycle = 1; cycle <= 4; cycle++) {
      // Pause
      await toggle.click();
      await expect(toggle).toHaveText("Resume animations");
      await expect(canvas).toBeHidden();
      const posterVisPaused = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
      expect(posterVisPaused).toBe("visible");

      // Resume
      await toggle.click();
      await expect(toggle).toHaveText("Pause animations");
      await expect(canvas).toBeVisible();
      const posterVisRunning = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
      expect(posterVisRunning).toBe("hidden");
    }
    await context.close();
  });

  test("6. Storage failure resilience: controls work for current page even if localStorage throws SecurityError", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate sandboxed/private browsing storage failure
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        }
      });
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // Auto-start works despite storage failure
    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");

    // User can pause
    await toggle.click();
    await expect(toggle).toHaveText("Resume animations");
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");

    // User can resume
    await toggle.click();
    await expect(toggle).toHaveText("Pause animations");
    await expect(canvas).toBeVisible();
    await context.close();
  });

  test("7. OS reduced motion overrides default-on: prevents module import, displays 'Reduced motion enabled'", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });

    let signalCoreFetched = false;
    page.on("request", (req) => {
      if (req.url().includes("signal-core.js")) {
        signalCoreFetched = true;
      }
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");
    const stage = page.locator(".core-stage");

    await page.waitForTimeout(400);

    // Module was NOT fetched
    expect(signalCoreFetched).toBe(false);

    // Toggle informs user and stays unpressed
    await expect(toggle).toHaveText("Reduced motion enabled");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(stage).toHaveAttribute("data-motion-state", "system-reduced");

    // Poster remains visible, canvas hidden
    await expect(poster).toBeVisible();
    await expect(canvas).toBeHidden();

    // Clicking toggle in reduced-motion mode does not force animation
    await toggle.click();
    expect(signalCoreFetched).toBe(false);
    await expect(toggle).toHaveText("Reduced motion enabled");
    await context.close();
  });

  test("8. Runtime change to reduced motion while running immediately tears down WebGL", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");
    const stage = page.locator(".core-stage");

    await expect(canvas).toBeVisible();

    // Emulate OS reduced-motion preference change
    await page.emulateMedia({ reducedMotion: "reduce" });

    // WebGL should tear down and poster restore
    await expect(toggle).toHaveText("Reduced motion enabled");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();
    await expect(stage).toHaveAttribute("data-motion-state", "system-reduced");

    // Restoring normal motion auto-resumes
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(stage).toHaveAttribute("data-motion-state", "running");
    await context.close();
  });

  test("9. Reduced-motion changes during async module loading aborts mounting", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let resolveRoute;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/marketing/signal-core.js", async (route) => {
      await routePromise;
      await route.continue();
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // While module is in-flight, change OS preference to reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Release the route response
    resolveRoute();

    // Button should display "Reduced motion enabled"
    await expect(toggle).toHaveText("Reduced motion enabled");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Canvas should NEVER become visible, poster remains visible
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
    await context.close();
  });

  test("10. Offscreen pausing: IntersectionObserver stops animation loop when canvas is out of viewport", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const canvas = page.locator("#signal-core");
    await expect(canvas).toBeVisible();

    const idleFrames = await page.evaluate(async () => {
      let frameCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        frameCount++;
        return origRaf(cb);
      };

      // Scroll down out of hero viewport (to system section)
      window.scrollTo(0, 1800);
      await new Promise((r) => setTimeout(r, 400));

      const framesWhileOffscreenStart = frameCount;
      await new Promise((r) => setTimeout(r, 300));
      const framesWhileOffscreenDelta = frameCount - framesWhileOffscreenStart;

      // Scroll back up into viewport
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
      const framesAfterReturnStart = frameCount;
      await new Promise((r) => setTimeout(r, 200));
      const framesAfterReturnDelta = frameCount - framesAfterReturnStart;

      window.requestAnimationFrame = origRaf;

      return { framesWhileOffscreenDelta, framesAfterReturnDelta };
    });

    // While offscreen, 0 new frames are requested
    expect(idleFrames.framesWhileOffscreenDelta).toBe(0);
    // When back on screen, frames resume
    expect(idleFrames.framesAfterReturnDelta).toBeGreaterThan(0);
    await context.close();
  });

  test("11. Document visibility: cancels RAF when document is hidden and resumes when visible", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const canvas = page.locator("#signal-core");
    await expect(canvas).toBeVisible();

    const visResult = await page.evaluate(async () => {
      let frameCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        frameCount++;
        return origRaf(cb);
      };

      // Simulate tab hidden
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      await new Promise((r) => setTimeout(r, 100));
      const framesWhileHiddenStart = frameCount;
      await new Promise((r) => setTimeout(r, 300));
      const framesWhileHiddenDelta = frameCount - framesWhileHiddenStart;

      // Simulate tab visible
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      await new Promise((r) => setTimeout(r, 100));
      const framesWhileVisibleStart = frameCount;
      await new Promise((r) => setTimeout(r, 200));
      const framesWhileVisibleDelta = frameCount - framesWhileVisibleStart;

      window.requestAnimationFrame = origRaf;

      return { framesWhileHiddenDelta, framesWhileVisibleDelta };
    });

    expect(visResult.framesWhileHiddenDelta).toBe(0);
    expect(visResult.framesWhileVisibleDelta).toBeGreaterThan(0);
    await context.close();
  });

  test("12. WebGL context loss cleanly restores poster, hides canvas, and resets toggle to Resume animations", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    await expect(canvas).toBeVisible();

    // Trigger context lost
    const handled = await page.evaluate(() => {
      const c = document.querySelector("#signal-core");
      const event = new Event("webglcontextlost", { cancelable: true });
      c.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(handled).toBe(true);

    // Canvas hidden and poster restored
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
    await expect(toggle).toHaveText("Resume animations");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await context.close();
  });

  test("13. WebGL unsupported gracefully falls back to static artwork", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Override getContext on canvas to simulate unsupported WebGL
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === "webgl" || type === "experimental-webgl") return null;
        return null;
      };
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");
    const stage = page.locator(".core-stage");

    await expect(toggle).toHaveText("Static artwork active");
    await expect(toggle).toBeDisabled();
    await expect(stage).toHaveAttribute("data-motion-state", "failed");
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
    await context.close();
  });

  test("14. Navigation to /console/ cleans up WebGL without console errors", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await expect(page.locator("#signal-core")).toBeVisible();

    // Click primary CTA to console
    const consoleLink = page.locator("a[href='/console/'], a[href='/console']").first();
    await consoleLink.click();
    await page.waitForURL("**/console/");
    expect(page.url()).toContain("/console");

    // No errors occurred during transition/cleanup
    expect(consoleErrors).toEqual([]);
    await context.close();
  });

  test("15. Failed enhancement module permanently disables control and displays static artwork text", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Abort dynamic import of WebGL module
    await page.route("**/marketing/signal-core.js", (route) => route.abort());

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const stage = page.locator(".core-stage");

    await expect(toggle).toHaveText("Static artwork active");
    await expect(toggle).toBeDisabled();
    await expect(stage).toHaveAttribute("data-motion-state", "failed");
    await expect(page.locator("#core-poster")).toBeVisible();
    await expect(page.locator("#signal-core")).toBeHidden();

    // Verify visibility changes and pagehide/pageshow do NOT re-enable the failed control
    await page.evaluate(() => {
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(toggle).toHaveText("Static artwork active");
    await expect(toggle).toBeDisabled();
    await context.close();
  });

  test("16. Pagehide during delayed import cancels activation and pageshow restores usable control", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let resolveFirstRoute;
    const firstRoutePromise = new Promise((resolve) => {
      resolveFirstRoute = resolve;
    });

    let routeCallCount = 0;
    await page.route("**/marketing/signal-core.js", async (route) => {
      routeCallCount++;
      if (routeCallCount === 1) {
        await firstRoutePromise;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // While module is in-flight on auto-start, trigger pagehide (user navigating away)
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));

    // Release the first route response
    resolveFirstRoute();

    // Canvas should NOT be mounted, poster remains visible
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();

    // Trigger pageshow (user returns to page)
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));

    // Control and sculpture recover cleanly to running
    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await context.close();
  });

  test("17. Temporary document visibility change during delayed import cancels activation and restores usable control", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let resolveRoute;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/marketing/signal-core.js", async (route) => {
      await routePromise;
      await route.continue();
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // Temporarily switch visibility to hidden while import is in-flight
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Release delayed route while hidden
    resolveRoute();

    // WebGL should not mount
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();

    // Restore visibility to visible
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Control and sculpture recover cleanly
    await expect(canvas).toBeVisible();
    await expect(toggle).toHaveText("Pause animations");
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await context.close();
  });

  test("18. Fine-pointer hover tilt and shell displacement applies delta-time smoothed response", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("#signal-core");
    const stage = page.locator(".core-stage");
    await expect(canvas).toBeVisible();

    // Dispatch mouse pointermove over stage (top-right quadrant: nx > 0, ny < 0)
    await stage.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const event = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        clientX: rect.left + rect.width * 0.85,
        clientY: rect.top + rect.height * 0.20
      });
      el.dispatchEvent(event);
    });

    // Allow a few RAF ticks for delta-time smoothing
    await page.waitForTimeout(200);

    const hoverState = await page.evaluate(() => {
      const teardown = window.__signalCore?.getTeardown();
      if (!teardown || !teardown.getTilt) return null;
      return {
        tilt: teardown.getTilt(),
        disp: teardown.getDispMult()
      };
    });

    expect(hoverState).not.toBeNull();
    // Tilt targets should be non-zero and within ±6° (±0.1047 rad)
    expect(hoverState.tilt.targetX).toBeGreaterThan(0); // tilted up (pointer at top)
    expect(hoverState.tilt.targetY).toBeGreaterThan(0); // tilted right (pointer at right)
    expect(Math.abs(hoverState.tilt.targetX)).toBeLessThanOrEqual(0.105);
    expect(Math.abs(hoverState.tilt.targetY)).toBeLessThanOrEqual(0.105);

    // Current smoothed tilt has progressed toward target
    expect(hoverState.tilt.x).toBeGreaterThan(0);
    expect(hoverState.tilt.y).toBeGreaterThan(0);

    // Shell wave displacement is expanded
    expect(hoverState.disp.target).toBe(1.12);
    expect(hoverState.disp.current).toBeGreaterThan(1.0);

    // Dispatch pointerleave
    await stage.evaluate((el) => {
      el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    });

    await page.waitForTimeout(400);

    const restingState = await page.evaluate(() => {
      const teardown = window.__signalCore?.getTeardown();
      if (!teardown || !teardown.getTilt) return null;
      return {
        tilt: teardown.getTilt(),
        disp: teardown.getDispMult()
      };
    });

    expect(restingState.tilt.targetX).toBe(0);
    expect(restingState.tilt.targetY).toBe(0);
    expect(restingState.disp.target).toBe(1.0);
    // Smoothed values returned close to rest
    expect(Math.abs(restingState.tilt.x)).toBeLessThan(0.02);
    expect(Math.abs(restingState.tilt.y)).toBeLessThan(0.02);
    expect(restingState.disp.current).toBeLessThan(1.05);
  });

  test("19. Touch fallback: pointerType='touch' does not trigger hover tilt or displacement", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("#signal-core");
    const stage = page.locator(".core-stage");
    await expect(canvas).toBeVisible();

    // Dispatch touch pointermove over stage
    await stage.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const event = new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        clientX: rect.left + rect.width * 0.9,
        clientY: rect.top + rect.height * 0.1
      });
      el.dispatchEvent(event);
    });

    await page.waitForTimeout(100);

    const touchState = await page.evaluate(() => {
      const teardown = window.__signalCore?.getTeardown();
      if (!teardown || !teardown.getTilt) return null;
      return {
        tilt: teardown.getTilt(),
        disp: teardown.getDispMult()
      };
    });

    expect(touchState).not.toBeNull();
    // Targets stay at 0 / 1.0 (ambient motion only)
    expect(touchState.tilt.targetX).toBe(0);
    expect(touchState.tilt.targetY).toBe(0);
    expect(touchState.disp.target).toBe(1.0);
  });

  test("20. No-JS resilience: #motion-toggle remains disabled and semantic content / poster is visible", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");

    await expect(toggle).toBeDisabled();
    await expect(poster).toBeVisible();
    await expect(canvas).toBeHidden();
    await expect(page.locator("h1")).toContainText("Your knowledge. A clearer answer.");

    await context.close();
  });
});
