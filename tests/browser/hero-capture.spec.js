import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Task 03: Full Hero Screenshot Evidence & Visibility Verification", () => {
  test("capture fresh full-hero screenshots and verify visibility & clearance", async ({ page }) => {
    // =========================================================================
    // 1. Desktop (1440x900) - Resting Poster Capture
    // =========================================================================
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Ensure resting state: move focus away
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    });
    await page.waitForTimeout(300);

    const hero = page.locator(".hero");
    const headline = page.locator("#hero-title");
    const lead = page.locator(".hero .lead");
    const cta = page.locator(".hero .actions .button.primary");
    const skipLink = page.locator(".skip-link");
    const poster = page.locator("#core-poster");
    const canvas = page.locator("#signal-core");
    const caption = page.locator(".core-stage figcaption .fine");
    const toggle = page.locator("#motion-toggle");

    // Assert full visibility of key elements
    await expect(headline).toBeVisible();
    await expect(lead).toBeVisible();
    await expect(cta).toBeVisible();
    await expect(poster).toBeVisible();
    await expect(canvas).toBeHidden();
    await expect(caption).toBeVisible();
    await expect(toggle).toBeVisible();

    // Verify skip link is offscreen in resting state
    const isSkipOffscreenDesktop = await skipLink.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top < 0;
    });
    expect(isSkipOffscreenDesktop).toBe(true);

    // Verify no focused element in resting state
    const restingFocused = await page.evaluate(() => document.activeElement === document.body);
    expect(restingFocused).toBe(true);

    // Capture resting desktop poster (full hero container)
    await hero.screenshot({
      path: path.resolve("docs/design-v3/screenshots/hero-final-poster-desktop.png")
    });

    // =========================================================================
    // 2. Desktop (1440x900) - Dedicated Keyboard Focus Capture
    // =========================================================================
    await toggle.focus();
    await expect(toggle).toBeFocused();

    // Query and assert actual computed focus outline
    const computedOutline = await toggle.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        outline: cs.outline,
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineOffset: cs.outlineOffset
      };
    });
    console.log("ACTUAL COMPUTED FOCUS OUTLINE ON #motion-toggle:", JSON.stringify(computedOutline));
    expect(computedOutline.outlineWidth).toBe("3px");
    expect(computedOutline.outlineStyle).toBe("solid");
    expect(computedOutline.outlineColor).toBe("rgb(255, 255, 255)");
    expect(computedOutline.outlineOffset).toBe("3px");

    // Capture dedicated keyboard focus screenshot
    await hero.screenshot({
      path: path.resolve("docs/design-v3/screenshots/hero-final-focus-desktop.png")
    });

    // =========================================================================
    // 3. Desktop (1440x900) - Resting Render Capture (Motion Enabled)
    // =========================================================================
    await toggle.click();
    await expect(canvas).toBeVisible();
    await expect(poster).toBeHidden();
    await page.waitForTimeout(800);

    // Move focus away for clean resting render capture
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    });
    await page.waitForTimeout(300);

    const restingRenderFocused = await page.evaluate(() => document.activeElement === document.body);
    expect(restingRenderFocused).toBe(true);

    // Capture resting desktop render (full hero container)
    await hero.screenshot({
      path: path.resolve("docs/design-v3/screenshots/hero-final-render-desktop.png")
    });

    // =========================================================================
    // 4. Mobile (390x844) - Resting Poster Capture
    // =========================================================================
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Move focus away
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    });
    await page.waitForTimeout(300);

    const heroMobile = page.locator(".hero");
    await expect(heroMobile.locator("#hero-title")).toBeVisible();
    await expect(heroMobile.locator(".lead")).toBeVisible();
    await expect(heroMobile.locator(".actions .button.primary")).toBeVisible();

    // Verify skip link is offscreen on mobile resting
    const isSkipOffscreenMobile = await page.locator(".skip-link").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom <= 0 || rect.top < 0;
    });
    expect(isSkipOffscreenMobile).toBe(true);

    // Verify clearance and non-obstruction on mobile
    const stageMobile = await page.locator(".core-stage").boundingBox();
    const figMobile = await page.locator(".core-stage figcaption").boundingBox();
    const fineMobile = await page.locator(".core-stage figcaption .fine").boundingBox();
    const btnMobile = await page.locator("#motion-toggle").boundingBox();
    const labelMobile = await page.locator(".core-label").boundingBox();
    const stripMobile = await page.locator(".system-strip").boundingBox();

    // Caption strictly below stage boundary and below core-label
    expect(figMobile.y).toBeGreaterThanOrEqual(stageMobile.y + stageMobile.height);
    expect(figMobile.y).toBeGreaterThanOrEqual(labelMobile.y + labelMobile.height + 15);
    // Vertical separation between caption and button
    expect(btnMobile.y).toBeGreaterThanOrEqual(fineMobile.y + fineMobile.height + 8);
    // Clearance before strip below
    expect(stripMobile.y).toBeGreaterThanOrEqual(figMobile.y + figMobile.height + 15);

    // Capture resting mobile poster
    await heroMobile.screenshot({
      path: path.resolve("docs/design-v3/screenshots/hero-final-poster-mobile.png")
    });

    // =========================================================================
    // 5. Mobile (390x844) - Resting Render Capture (Motion Enabled)
    // =========================================================================
    await page.locator("#motion-toggle").click();
    await expect(page.locator("#signal-core")).toBeVisible();
    await page.waitForTimeout(800);

    // Move focus away for clean resting render capture
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    });
    await page.waitForTimeout(300);

    // Capture resting mobile render
    await heroMobile.screenshot({
      path: path.resolve("docs/design-v3/screenshots/hero-final-render-mobile.png")
    });
  });
});
