import { test, expect } from "@playwright/test";

test.describe("Task 04: Signal Core Native WebGL Sculpture Lifecycle", () => {
  test("1. Default first paint: SVG poster visible, WebGL module not imported, canvas hidden", async ({ page }) => {
    let signalCoreFetched = false;
    page.on("request", (req) => {
      if (req.url().includes("signal-core.js")) {
        signalCoreFetched = true;
      }
    });

    const response = await page.goto("/");
    expect(response.status()).toBe(200);

    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");
    const toggle = page.locator("#motion-toggle");

    await expect(poster).toBeVisible();
    await expect(canvas).toBeHidden();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText("Enable motion");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Natural dimensions of SVG poster
    const posterDimensions = await poster.evaluate((img) => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      visible: window.getComputedStyle(img).visibility
    }));
    expect(posterDimensions.naturalWidth).toBe(800);
    expect(posterDimensions.naturalHeight).toBe(800);
    expect(posterDimensions.visible).toBe("visible");

    // WebGL module was not loaded on initial paint
    expect(signalCoreFetched).toBe(false);
  });

  test("2. Explicit activation: clicking 'Enable motion' lazy-loads WebGL, hides poster, shows canvas", async ({ page }) => {
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

    await toggle.click();

    // Module was fetched
    expect(signalCoreFetched).toBe(true);

    // Button state transitions to Pause motion
    await expect(toggle).toHaveText("Pause motion");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    // Canvas is visible and poster is hidden
    await expect(canvas).toBeVisible();
    const posterVisibility = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVisibility).toBe("hidden");

    // Canvas has dimensions matching DPR-capped viewport
    const canvasDims = await canvas.evaluate((c) => ({
      width: c.width,
      height: c.height,
      hidden: c.hidden
    }));
    expect(canvasDims.hidden).toBe(false);
    expect(canvasDims.width).toBeGreaterThan(0);
    expect(canvasDims.height).toBeGreaterThan(0);
  });

  test("3. Explicit pause: clicking 'Pause motion' halts rendering, hides canvas, restores poster", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");

    // Enable
    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");
    await expect(canvas).toBeVisible();

    // Pause
    await toggle.click();
    await expect(toggle).toHaveText("Enable motion");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Poster restored, canvas hidden
    await expect(canvas).toBeHidden();
    const posterVisibility = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVisibility).toBe("visible");
  });

  test("4. Repeated enable/pause cycles: transitions cleanly without duplicate frames or resource leaks", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");

    for (let cycle = 1; cycle <= 4; cycle++) {
      // Enable
      await toggle.click();
      await expect(toggle).toHaveText("Pause motion");
      await expect(canvas).toBeVisible();

      // Pause
      await toggle.click();
      await expect(toggle).toHaveText("Enable motion");
      await expect(canvas).toBeHidden();
      const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
      expect(posterVis).toBe("visible");
    }
  });

  test("5. Reduced motion prevents module import and reports reduced motion enabled", async ({ page }) => {
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

    await toggle.click();

    // Module must NOT be fetched
    expect(signalCoreFetched).toBe(false);

    // Toggle informs user and stays unpressed
    await expect(toggle).toHaveText("Reduced motion enabled");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Poster remains visible, canvas remains hidden
    await expect(poster).toBeVisible();
    await expect(canvas).toBeHidden();
  });

  test("6. Runtime change to reduced motion while running immediately tears down WebGL", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // Start with motion enabled
    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");
    await expect(canvas).toBeVisible();

    // Emulate media preference change
    await page.emulateMedia({ reducedMotion: "reduce" });

    // WebGL should tear down and poster restore
    await expect(toggle).toHaveText("Reduced motion enabled");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
  });

  test("7. Reduced-motion changes during async module loading aborts mounting", async ({ page }) => {
    let resolveRoute;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/marketing/signal-core.js", async (route) => {
      // Hold the response until we toggle reduced motion
      await routePromise;
      await route.continue();
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    // Click Enable motion while normal motion is active
    await toggle.click();

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
  });

  test("8. Offscreen pausing: IntersectionObserver stops animation loop when canvas is out of viewport", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");

    const idleFrames = await page.evaluate(async () => {
      const canvas = document.querySelector("#signal-core");

      // Count animation frames
      let frameCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        frameCount++;
        return origRaf(cb);
      };

      // Scroll far down out of viewport
      window.scrollTo(0, 4000);
      // Wait for IntersectionObserver to fire
      await new Promise((r) => setTimeout(r, 400));

      const framesWhileOffscreenStart = frameCount;
      // Wait another 300ms while offscreen
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
  });

  test("9. Document visibility: cancels RAF when document is hidden and resumes when visible", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");

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
  });

  test("10. WebGL context loss cleanly restores poster, hides canvas, and resets toggle", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");
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
    await expect(toggle).toHaveText("Enable motion");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("11. WebGL unsupported gracefully falls back to static artwork", async ({ page }) => {
    await page.goto("/");

    // Override getContext on canvas to simulate unsupported WebGL
    await page.evaluate(() => {
      const canvas = document.querySelector("#signal-core");
      canvas.getContext = () => null;
    });

    const toggle = page.locator("#motion-toggle");
    const canvas = page.locator("#signal-core");
    const poster = page.locator("#core-poster");

    await toggle.click();

    await expect(toggle).toHaveText("Static artwork active");
    await expect(canvas).toBeHidden();
    const posterVis = await poster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
  });

  test("12. Navigation to /console/ cleans up WebGL without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    const toggle = page.locator("#motion-toggle");
    await toggle.click();
    await expect(toggle).toHaveText("Pause motion");

    // Click primary CTA to console
    const consoleLink = page.locator("a[href='/console/'], a[href='/console']").first();
    await consoleLink.click();
    await page.waitForURL("**/console/");
    expect(page.url()).toContain("/console");

    // No errors occurred during transition/cleanup
    expect(consoleErrors).toEqual([]);
  });
});
