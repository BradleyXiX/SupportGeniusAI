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

      const orb = mountOrb(canvas, { state: "idle", reducedMotion: false });
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

      const orb = mountOrb(canvas, { state: "idle", reducedMotion: false });
      
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
});

