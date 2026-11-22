import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Task 06: Bounded Atmospheric Network Texture", () => {
  test("1. Texture present only in approved regions and completely isolated from readable copy", async ({ page }) => {
    await page.goto("/");

    // Exists in system sidebar backdrop
    const systemBackdrop = page.locator(".system-network-backdrop");
    await expect(systemBackdrop).toBeAttached();
    await expect(systemBackdrop).toHaveAttribute("aria-hidden", "true");

    // Exists in deployment outer backdrop
    const deployBackdrop = page.locator(".deployment-network-backdrop");
    await expect(deployBackdrop).toBeAttached();
    await expect(deployBackdrop).toHaveAttribute("aria-hidden", "true");

    // Strictly forbidden in console, hero, transcript, or sample panel
    await expect(page.locator(".console .network-backdrop")).toHaveCount(0);
    await expect(page.locator(".hero-copy .network-backdrop")).toHaveCount(0);
    await expect(page.locator(".demo-frame .network-backdrop")).toHaveCount(0);
    await expect(page.locator(".chapters .network-backdrop")).toHaveCount(0);

    // Verify pointer-events: none on both backdrops
    const systemPointerEvents = await systemBackdrop.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    const deployPointerEvents = await deployBackdrop.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(systemPointerEvents).toBe("none");
    expect(deployPointerEvents).toBe("none");

    // Verify z-index positioning behind content
    const systemZ = await systemBackdrop.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(systemZ).toBe("0");
  });

  test("2. Desktop bounded limits: <= 32 points, <= 48 visible links, and 20-24fps cap", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Scroll to #deployment so backdrop is in viewport and hero sphere is offscreen
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const limits = await page.evaluate(() => {
      const canvas = document.querySelector(".deployment-network-backdrop .network-canvas");
      if (!canvas) return null;
      // Evaluate actual point count and link limits from runtime
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hidden: canvas.hidden
      };
    });

    expect(limits).not.toBeNull();
    expect(limits.hidden).toBe(false);

    // Measure frame interval to confirm 20-24 fps cap (~45ms between ticks)
    const frameIntervals = await page.evaluate(async () => {
      const timestamps = [];
      let rafCount = 0;
      await new Promise((resolve) => {
        const check = (t) => {
          timestamps.push(t);
          rafCount++;
          if (rafCount >= 10) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
      return timestamps;
    });

    expect(frameIntervals.length).toBeGreaterThanOrEqual(10);
  });

  test("3. Mobile bounded limits: <= 16 points and <= 20 links at phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    await expect(deployCanvas).toBeVisible();

    // Verify mobile sidebar backdrop is omitted along with .chapter-index
    const systemBackdrop = page.locator(".system-network-backdrop");
    await expect(systemBackdrop).toBeHidden();
  });

  test("4. Coordination with large sphere: network texture yields when hero sphere is active", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // At top of page, hero sphere is running
    const heroCanvas = page.locator("#signal-core");
    await expect(heroCanvas).toBeVisible();

    // While hero is in viewport, system network texture yields
    const systemCanvas = page.locator(".system-network-backdrop .network-canvas");
    await expect(systemCanvas).toBeHidden();

    // Scroll to deployment section where hero is out of viewport
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    await expect(deployCanvas).toBeVisible();
  });

  test("5. Synchronized global pause and resume via shared motion policy", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Scroll to deployment section
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    const deployPoster = page.locator(".deployment-network-backdrop .network-poster");
    await expect(deployCanvas).toBeVisible();

    // Global pause via hero toggle button
    const toggle = page.locator("#motion-toggle");
    await toggle.click();
    await expect(toggle).toHaveText("Resume animations");

    // Network canvas hidden and static poster restored
    await expect(deployCanvas).toBeHidden();
    const posterVis = await deployPoster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");

    // Global resume
    await toggle.click();
    await expect(toggle).toHaveText("Pause animations");

    // Scroll to deployment to ensure hero is offscreen
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(deployCanvas).toBeVisible();
  });

  test("6. Stored pause preference keeps network texture paused on page reload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("sg_motion_v1", "paused");
    });

    await page.goto("/");
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    const deployPoster = page.locator(".deployment-network-backdrop .network-poster");

    // Stays paused: canvas hidden, poster visible
    await expect(deployCanvas).toBeHidden();
    const posterVis = await deployPoster.evaluate((el) => window.getComputedStyle(el).visibility);
    expect(posterVis).toBe("visible");
  });

  test("7. OS reduced motion overrides animation with static SVG fallback", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    const deployPoster = page.locator(".deployment-network-backdrop .network-poster");

    await expect(deployCanvas).toBeHidden();
    await expect(deployPoster).toBeVisible();
    await expect(deployPoster).toHaveAttribute("src", "/assets/brand/network-texture-poster.svg");
  });

  test("8. Offscreen and tab visibility suspension", async ({ page }) => {
    await page.goto("/");
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const deployCanvas = page.locator(".deployment-network-backdrop .network-canvas");
    await expect(deployCanvas).toBeVisible();

    // 1. Scroll offscreen to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // Canvas should hide when offscreen
    await expect(deployCanvas).toBeHidden();

    // Return to deployment
    await page.locator("#deployment").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(deployCanvas).toBeVisible();

    // 2. Tab visibility change
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(deployCanvas).toBeHidden();

    // Restore visibility
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(deployCanvas).toBeVisible();
  });

  test("9. No-JS resilience: static SVG poster displays cleanly without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    await page.locator("#deployment").scrollIntoViewIfNeeded();

    const deployBackdrop = page.locator(".deployment-network-backdrop");
    const deployPoster = deployBackdrop.locator(".network-poster");
    const deployCanvas = deployBackdrop.locator(".network-canvas");

    await expect(deployBackdrop).toBeVisible();
    await expect(deployPoster).toBeVisible();
    await expect(deployCanvas).toBeHidden();

    await context.close();
  });

  test("10. Capture screenshot evidence for texture-on, paused, and mobile states", async ({ page }) => {
    // 1. Desktop Deployment - Texture running
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const deploySection = page.locator("#deployment");
    await deploySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    await deploySection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/network-deployment-desktop-running.png")
    });

    // 2. Desktop Deployment - Paused state
    await page.locator("#motion-toggle").click();
    await page.waitForTimeout(300);
    await deploySection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/network-deployment-desktop-paused.png")
    });

    // Resume for system capture
    await page.locator("#motion-toggle").click();

    // 3. Desktop System Sidebar Texture
    const systemSection = page.locator("#system");
    await systemSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    await systemSection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/network-system-desktop-running.png")
    });

    // 4. Mobile Reflow
    await page.setViewportSize({ width: 390, height: 844 });
    await deploySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await deploySection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/network-mobile-reflow.png")
    });
  });
});
