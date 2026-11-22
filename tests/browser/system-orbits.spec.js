import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Task 05: System Logo Orbits, Canonical Prism & Shared Motion Policy", () => {
  test("1. Fixed canonical prism mark replaces legacy SG text", async ({ page }) => {
    await page.goto("/");

    const orbit = page.locator(".orbit-small");
    await expect(orbit).toBeAttached();

    // Verify canonical prism mark is present inside orbit-center
    const prismMark = orbit.locator(".orbit-center img.orbit-prism-mark");
    await expect(prismMark).toBeAttached();
    await expect(prismMark).toHaveAttribute("src", "/assets/brand/supportgenius-mark.svg");
    await expect(prismMark).toHaveAttribute("width", "36");
    await expect(prismMark).toHaveAttribute("height", "36");

    // Verify legacy SG bold text is completely removed
    const legacySgText = orbit.locator("b");
    await expect(legacySgText).toHaveCount(0);
  });

  test("2. Three separate-wrapper orbit tracks enforce single transform owner", async ({ page }) => {
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const tracks = page.locator(".orbit-small .orbit-track");
    await expect(tracks).toHaveCount(3);

    // Verify each track has separate orbit-tilt and orbit-spin wrappers
    for (let i = 0; i < 3; i++) {
      const track = tracks.nth(i);
      const tiltWrapper = track.locator(".orbit-tilt");
      const spinWrapper = track.locator(".orbit-tilt > .orbit-spin");
      const pathEl = spinWrapper.locator(".orbit-path");
      const nodeEl = spinWrapper.locator(".orbit-node");

      await expect(tiltWrapper).toBeVisible();
      await expect(spinWrapper).toBeVisible();
      await expect(pathEl).toBeVisible();
      await expect(nodeEl).toBeVisible();

      // Check single transform owner: orbit-tilt has static transform and NO animation
      const tiltStyles = await tiltWrapper.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          animationName: cs.animationName,
          hasTransform: cs.transform !== "none"
        };
      });
      expect(tiltStyles.hasTransform).toBe(true);
      expect(tiltStyles.animationName).toBe("none");

      // Check single transform owner: orbit-spin has keyframe animation
      const spinStyles = await spinWrapper.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
          animationTimingFunction: cs.animationTimingFunction,
          animationIterationCount: cs.animationIterationCount
        };
      });
      expect(spinStyles.animationName).toMatch(/orbit-spin-(cw|ccw)/);
      expect(spinStyles.animationIterationCount).toBe("infinite");
    }

    // Verify opposite rotation directions and periods
    const spin1 = await page.locator(".track-1 .orbit-spin").evaluate((el) => window.getComputedStyle(el).animationName);
    const spin2 = await page.locator(".track-2 .orbit-spin").evaluate((el) => window.getComputedStyle(el).animationName);
    const spin3 = await page.locator(".track-3 .orbit-spin").evaluate((el) => window.getComputedStyle(el).animationName);
    expect(spin1).toBe("orbit-spin-cw");
    expect(spin2).toBe("orbit-spin-ccw");
    expect(spin3).toBe("orbit-spin-cw");
  });

  test("3. Synchronized pause and resume with hero motion policy", async ({ page }) => {
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const toggle = page.locator("#motion-toggle");
    const orbit = page.locator(".orbit-small");
    const trackSpin = page.locator(".track-1 .orbit-spin");

    // Initially running when visible in viewport
    await expect(orbit).toHaveAttribute("data-motion", "running");
    let playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("running");

    // Click hero Pause animations
    await toggle.click();
    await expect(toggle).toHaveText("Resume animations");

    // Orbits immediately synchronize to paused
    await expect(orbit).toHaveAttribute("data-motion", "paused");
    playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");

    // Click hero Resume animations
    await toggle.click();
    await expect(toggle).toHaveText("Pause animations");

    // Scroll back to #system so .orbit-small is in viewport
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Orbits resume synchronization
    await expect(orbit).toHaveAttribute("data-motion", "running");
    playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("running");
  });

  test("4. Stored pause preference persists to orbits on page reload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("sg_motion_v1", "paused");
    });

    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const orbit = page.locator(".orbit-small");
    const trackSpin = page.locator(".track-1 .orbit-spin");

    await expect(orbit).toHaveAttribute("data-motion", "paused");
    const playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");
  });

  test("5. OS reduced motion overrides animation without frame loop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const orbit = page.locator(".orbit-small");
    const trackSpin = page.locator(".track-1 .orbit-spin");

    await expect(orbit).toHaveAttribute("data-motion", "paused");

    // In reduced-motion media query, animation is none
    const animName = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationName);
    expect(animName).toBe("none");
  });

  test("6. Offscreen and tab visibility suspension", async ({ page }) => {
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const orbit = page.locator(".orbit-small");
    const trackSpin = page.locator(".track-1 .orbit-spin");

    await expect(orbit).toHaveAttribute("data-motion", "running");

    // 1. Offscreen suspension via scroll back to top (hero)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // When scrolled out of viewport, play-state is paused
    await expect(orbit).toHaveAttribute("data-motion", "paused");
    let playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");

    // Return to #system section
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    await expect(orbit).toHaveAttribute("data-motion", "running");
    playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("running");

    // 2. Tab visibility suspension
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(orbit).toHaveAttribute("data-motion", "paused");
    playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("paused");

    // Restore tab visibility
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await expect(orbit).toHaveAttribute("data-motion", "running");
    playState = await trackSpin.evaluate((el) => window.getComputedStyle(el).animationPlayState);
    expect(playState).toBe("running");
  });

  test("7. Illustrative chapter highlight tracks active chapter disclosure", async ({ page }) => {
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const orbit = page.locator(".orbit-small");
    const chapters = page.locator("#system details");

    // Initial state: Chapter 1 is open
    await expect(orbit).toHaveAttribute("data-active-chapter", "1");

    // Open Chapter 2
    await chapters.nth(1).locator("summary").click();
    await expect(chapters.nth(0)).not.toHaveAttribute("open", "");
    await expect(chapters.nth(1)).toHaveAttribute("open", "");
    await expect(orbit).toHaveAttribute("data-active-chapter", "2");

    // Open Chapter 3
    await chapters.nth(2).locator("summary").click();
    await expect(chapters.nth(1)).not.toHaveAttribute("open", "");
    await expect(chapters.nth(2)).toHaveAttribute("open", "");
    await expect(orbit).toHaveAttribute("data-active-chapter", "3");

    // Explanatory copy remains completely static
    const explanation = page.locator(".chapter-index .fine");
    await expect(explanation).toContainText("Select a step to explore the system.");
    await expect(explanation).toContainText("Illustration, not live processing telemetry.");
  });

  test("8. Mobile reflow omits decorative orbit mark and preserves chapter disclosure usability", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();

    const chapterIndex = page.locator(".chapter-index");
    // At <= 760px, decorative sidebar is omitted per design.md
    await expect(chapterIndex).toBeHidden();

    // Chapter disclosures remain fully visible and operable
    const chapters = page.locator("#system details");
    await expect(chapters.nth(0)).toBeVisible();
    await expect(chapters.nth(1)).toBeVisible();
    await expect(chapters.nth(2)).toBeVisible();

    // Toggle Chapter 2 on mobile
    await chapters.nth(1).locator("summary").click();
    await expect(chapters.nth(1)).toHaveAttribute("open", "");
  });

  test("9. No-JS resilience: static tilted rings and canonical logo render without script", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    await page.locator("#system").scrollIntoViewIfNeeded();

    const orbit = page.locator(".orbit-small");
    const prismMark = orbit.locator(".orbit-prism-mark");

    await expect(orbit).toBeVisible();
    await expect(prismMark).toBeVisible();
    await expect(page.locator(".track-1 .orbit-tilt")).toBeVisible();
    await expect(page.locator(".track-2 .orbit-tilt")).toBeVisible();
    await expect(page.locator(".track-3 .orbit-tilt")).toBeVisible();

    await context.close();
  });

  test("10. Capture screenshot evidence for running, paused, and mobile states", async ({ page }) => {
    // 1. Desktop (1440x900) - Running state
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const systemSection = page.locator("#system");
    await systemSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    await systemSection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/system-orbits-desktop-running.png")
    });

    // 2. Desktop (1440x900) - Paused state
    await page.locator("#motion-toggle").click();
    await page.waitForTimeout(300);
    await systemSection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/system-orbits-desktop-paused.png")
    });

    // 3. Mobile (390x844) - Mobile chapters reflow
    await page.setViewportSize({ width: 390, height: 844 });
    await systemSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await systemSection.screenshot({
      path: path.resolve("docs/design-v3/screenshots/system-chapters-mobile.png")
    });
  });
});
