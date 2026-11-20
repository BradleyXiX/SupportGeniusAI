import { test, expect } from "@playwright/test";

test.describe("Task 05: System Chapters and Capability Strip", () => {
  test("1. Capability strip renders between hero and #system with 4 items", async ({ page }) => {
    await page.goto("/");

    const strip = page.locator(".system-strip");
    await expect(strip).toBeVisible();

    await expect(strip).toContainText("DOCUMENT-BASED ANSWERS");
    await expect(strip).toContainText("CONFIGURABLE MODELS");
    await expect(strip).toContainText("FOCUSED CONVERSATIONS");
    await expect(strip.locator(".strip-index")).toContainText("SG / 001");
  });

  test("2. Header nav and hero secondary link target #system", async ({ page }) => {
    await page.goto("/");

    const headerNav = page.locator(".site-nav a[href='#system']");
    await expect(headerNav).toBeVisible();
    await expect(headerNav).toHaveText("The system");

    const heroLink = page.locator(".hero a[href='#system']");
    await expect(heroLink).toBeVisible();
    await expect(heroLink).toContainText("See the system");

    // Clicking hero link targets #system
    await heroLink.click();
    const systemSection = page.locator("#system");
    await expect(systemSection).toBeInViewport();
  });

  test("3. Single-open exclusive accordion behavior on click", async ({ page }) => {
    await page.goto("/");

    const chapters = page.locator("#system details");
    expect(await chapters.count()).toBe(3);

    const chapter1 = chapters.nth(0);
    const chapter2 = chapters.nth(1);
    const chapter3 = chapters.nth(2);

    // Initial state: Chapter 01 is open by default
    await expect(chapter1).toHaveAttribute("open", "");
    expect(await chapter2.getAttribute("open")).toBeNull();
    expect(await chapter3.getAttribute("open")).toBeNull();

    // Click Chapter 02 summary
    await chapter2.locator("summary").click();
    await expect(chapter2).toHaveAttribute("open", "");
    expect(await chapter1.getAttribute("open")).toBeNull();
    expect(await chapter3.getAttribute("open")).toBeNull();

    // Click Chapter 03 summary
    await chapter3.locator("summary").click();
    await expect(chapter3).toHaveAttribute("open", "");
    expect(await chapter1.getAttribute("open")).toBeNull();
    expect(await chapter2.getAttribute("open")).toBeNull();
  });

  test("4. Keyboard Enter and Space toggle disclosure and focus is visible", async ({ page }) => {
    await page.goto("/");

    const chapter2 = page.locator("#system details").nth(1);
    const summary2 = chapter2.locator("summary");

    await summary2.focus();
    await page.keyboard.press("Enter");

    // Chapter 2 opens via Enter key
    await expect(chapter2).toHaveAttribute("open", "");

    // Press Space key to close
    await page.keyboard.press("Space");
    expect(await chapter2.getAttribute("open")).toBeNull();
  });

  test("5. Operable without JavaScript: native details elements toggle independently", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    const system = page.locator("#system");
    await expect(system).toBeVisible();

    const chapter1 = system.locator("details").nth(0);
    const chapter2 = system.locator("details").nth(1);

    await expect(chapter1).toHaveAttribute("open", "");
    await expect(chapter1.locator(".chapter-body")).toBeVisible();

    // Click summary 2 without JS
    await chapter2.locator("summary").click();
    await expect(chapter2).toHaveAttribute("open", "");
    await expect(chapter2.locator(".chapter-body")).toBeVisible();

    await context.close();
  });

  test("6. Responsive reflow and mobile omission of decorative sidebar", async ({ page }) => {
    // Desktop: sidebar is visible
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const sidebar = page.locator("#system .chapter-index");
    await expect(sidebar).toBeVisible();

    // Mobile: sidebar is hidden while chapters remain visible and operable
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sidebar).toBeHidden();

    const chapters = page.locator("#system .chapters");
    await expect(chapters).toBeVisible();

    // Check no overflow at 390px and 320px
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }
  });

  test("7. Accurate copy: explicitly disclaims customer actions, live telemetry, and citations", async ({ page }) => {
    await page.goto("/");

    const system = page.locator("#system");

    // Telemetry disclosure
    await expect(system.locator(".chapter-index")).toContainText("Illustration, not live processing telemetry");

    // Document support disclaimer
    await expect(system).toContainText("Approved policy and support documents form the context for a reply");

    // Explicit disclaimer of customer actions and citations
    await expect(system).toContainText("Customer actions and source citations are not available in the current release");
  });
});
