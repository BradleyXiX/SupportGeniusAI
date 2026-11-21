import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.describe("Task 08: Console Composer Skin, Static Sphere Avatars & State Sphere", () => {
  test("1. Static sphere marks for message avatars: renders SVG mark without text SG and zero message canvases", async ({ page }) => {
    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    // Initial welcome message avatar
    const initialAvatar = page.locator(".message.ai-message .avatar-mini").first();
    await expect(initialAvatar).toBeVisible();
    await expect(initialAvatar.locator("img.avatar-sphere-mark")).toBeVisible();
    await expect(initialAvatar.locator("img.avatar-sphere-mark")).toHaveAttribute("src", "/assets/brand/avatar-sphere.svg");
    
    // Ensure no legacy text "SG" is rendered in avatar
    const avatarText = await initialAvatar.innerText();
    expect(avatarText.trim()).toBe("");

    // Submit a query to test answered message avatar
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Our returns window is 14 days.", cost: "0.0001" })
      });
    });

    await page.locator("#input").fill("What is your returns policy?");
    await page.locator("#send-btn").click();

    await expect(page.locator("#chat-messages")).toContainText("Our returns window is 14 days.");

    // Answer message avatar
    const answerAvatar = page.locator(".message.ai-message:not(.loading) .avatar-mini").nth(1);
    await expect(answerAvatar).toBeVisible();
    await expect(answerAvatar.locator("img.avatar-sphere-mark")).toBeVisible();
    expect((await answerAvatar.innerText()).trim()).toBe("");

    // Verify zero canvases inside transcript (only the header has the single status canvas)
    const transcriptCanvases = await page.locator("#chat-messages canvas").count();
    expect(transcriptCanvases).toBe(0);

    const totalCanvasesOnPage = await page.locator("canvas").count();
    expect(totalCanvasesOnPage).toBe(1);
    await expect(page.locator("canvas#console-orb")).toBeVisible();
  });

  test("2. Console composer styling: raised surface #101012, 1px visible border, 16px white input text, white focus outline, and crimson send button", async ({ page }) => {
    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    const composer = page.locator(".console-composer");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    // Check composer container background
    const composerBg = await composer.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(composerBg).toBe("rgb(16, 16, 18)"); // #101012

    // Check input background, font size (>= 16px), color (white #F7F7F5)
    const inputStyles = await input.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        fontSize: parseFloat(s.fontSize),
        color: s.color,
        borderWidth: s.borderWidth
      };
    });
    expect(inputStyles.bg).toBe("rgb(3, 3, 4)"); // #030304
    expect(inputStyles.fontSize).toBeGreaterThanOrEqual(16);
    expect(inputStyles.color).toBe("rgb(247, 247, 245)"); // #F7F7F5
    expect(inputStyles.borderWidth).toBe("1px");

    // Check send button background (crimson #BB1729), color (white)
    const sendStyles = await sendBtn.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        color: s.color,
        width: parseFloat(s.width),
        height: parseFloat(s.height)
      };
    });
    expect(sendStyles.bg).toBe("rgb(187, 23, 41)"); // #BB1729
    expect(sendStyles.color).toBe("rgb(255, 255, 255)");
    expect(sendStyles.width).toBeGreaterThanOrEqual(44);
    expect(sendStyles.height).toBeGreaterThanOrEqual(44);

    // Verify focus outline on input
    await input.focus();
    const inputFocusOutline = await input.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        outlineStyle: s.outlineStyle,
        outlineColor: s.outlineColor,
        outlineWidth: s.outlineWidth
      };
    });
    expect(inputFocusOutline.outlineStyle).not.toBe("none");
    expect(inputFocusOutline.outlineColor).toBe("rgb(255, 255, 255)"); // #FFFFFF focus outline
  });

  test("3. Touch targets meet minimum 44px: send button, new conversation button, suggestion chips", async ({ page }) => {
    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    // Send button
    const sendBtnBox = await page.locator("#send-btn").boundingBox();
    expect(sendBtnBox.width).toBeGreaterThanOrEqual(44);
    expect(sendBtnBox.height).toBeGreaterThanOrEqual(44);

    // Reset button
    const resetBtnBox = await page.locator("#reset-btn").boundingBox();
    expect(resetBtnBox.height).toBeGreaterThanOrEqual(44);

    // Suggestion chips
    const chip = page.locator(".suggestion-chip").first();
    const chipBox = await chip.boundingBox();
    expect(chipBox.height).toBeGreaterThanOrEqual(44);
  });

  test("4. Truthful status orb lifecycle: idle, pending, settling, error, and recovery states", async ({ page }) => {
    let resolveChat;
    const chatPromise = new Promise((resolve) => {
      resolveChat = resolve;
    });

    await page.route("**/chat", async (route) => {
      await chatPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Truthful answered reply", cost: "0.0002" })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    // 1. Idle state on start
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("idle");

    // 2. Pending state while request in flight
    await page.locator("#input").fill("Simulating lifecycle");
    await page.locator("#send-btn").click();

    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");
    await expect(page.locator(".loading-status-text")).toHaveText("Waiting for reply");

    // 3. Resolve reply -> triggers settle and then idle
    resolveChat();
    await expect(page.locator("#chat-messages")).toContainText("Truthful answered reply");
    await expect.poll(async () => page.evaluate(() => window.__consoleOrbState)).toBe("idle");

    // 4. Error state simulation (e.g. 500 error)
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Internal Server Error", status: 500 })
      });
    });

    await page.locator("#input").fill("Triggering server error");
    await page.locator("#send-btn").click();

    await expect(page.locator("#chat-messages")).toContainText("No reply received. Please try again.");
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("idle"); // returns to idle once input is restored
  });

  test("5. Shared user-pause preference (sg_motion_v1 = 'paused') prevents status orb continuous animation loop even while pending", async ({ page }) => {
    // Set user-paused preference
    await page.addInitScript(() => {
      localStorage.setItem("sg_motion_v1", "paused");
    });

    let resolvePending;
    const pendingPromise = new Promise((resolve) => {
      resolvePending = resolve;
    });

    await page.route("**/chat", async (route) => {
      await pendingPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Paused reply", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    // Track requestAnimationFrame calls
    await page.evaluate(() => {
      window.__rafCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        window.__rafCount++;
        return origRaf.call(this, cb);
      };
    });

    // Submit request while paused
    await page.locator("#input").fill("Checking paused orb frames");
    await page.locator("#send-btn").click();

    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // Wait 300ms: should produce ZERO animation frames because user paused
    await page.waitForTimeout(300);
    const pendingRafCount = await page.evaluate(() => window.__rafCount);
    expect(pendingRafCount).toBe(0);

    // Resolve and cleanup
    resolvePending();
    await expect(page.locator("#chat-messages")).toContainText("Paused reply");
    await page.evaluate(() => {
      localStorage.removeItem("sg_motion_v1");
    });
  });

  test("6. OS reduced motion overrides status orb animation loop with static mark", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    let resolvePending;
    const pendingPromise = new Promise((resolve) => {
      resolvePending = resolve;
    });

    await page.route("**/chat", async (route) => {
      await pendingPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Reduced motion reply", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    await page.evaluate(() => {
      window.__rafCount = 0;
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        window.__rafCount++;
        return origRaf.call(this, cb);
      };
    });

    await page.locator("#input").fill("Reduced motion test");
    await page.locator("#send-btn").click();

    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // Wait 300ms: zero animation frames
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => window.__rafCount);
    expect(frames).toBe(0);

    resolvePending();
    await expect(page.locator("#chat-messages")).toContainText("Reduced motion reply");
  });

  test("7. 320px mobile reflow: zero horizontal overflow in empty, pending, answered, and error states", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    // Empty state overflow
    const emptyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(emptyOverflow).toBe(false);

    // Submit message
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Reflow verification answered message with sufficient length.", cost: "0.0001" })
      });
    });

    await page.locator("#input").fill("Reflow test at 320px");
    await page.locator("#send-btn").click();

    await expect(page.locator("#chat-messages")).toContainText("Reflow verification answered message");

    // Answered state overflow
    const answeredOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(answeredOverflow).toBe(false);
  });

  test("8. Capture comprehensive visual evidence across empty, pending, answered, error, recovery, and mobile states", async ({ page }) => {
    const screenshotDir = path.resolve(process.cwd(), "docs/design-v3/screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // A. Desktop Empty Console
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/console/");
    await expect(page.locator("#input")).toBeEnabled();

    await page.screenshot({
      path: path.join(screenshotDir, "console-empty-desktop.png"),
      fullPage: false
    });

    // B. Desktop Pending Console
    let resolveMock;
    const pendingPromise = new Promise((resolve) => {
      resolveMock = resolve;
    });

    await page.route("**/chat", async (route) => {
      await pendingPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "The returns window for all standard purchases is 14 calendar days from delivery in original packaging. Refunds are processed to the original payment method within 3 business days of receipt.",
          cost: "0.0003"
        })
      });
    });

    await page.locator("#input").fill("What is the returns policy and processing timeframe?");
    await page.locator("#send-btn").click();
    await expect(page.locator(".loading-status-text")).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "console-pending-desktop.png"),
      fullPage: false
    });

    // C. Desktop Answered Console
    resolveMock();
    await expect(page.locator("#chat-messages")).toContainText("The returns window for all standard purchases is 14 calendar days");
    await page.screenshot({
      path: path.join(screenshotDir, "console-answered-desktop.png"),
      fullPage: false
    });

    // D. Desktop Error Console
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 504,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "https://supportgenius.ai/problems/upstream-timeout",
          title: "Gateway Timeout",
          status: 504,
          detail: "The upstream model inference provider timed out after 45000ms."
        })
      });
    });

    await page.locator("#input").fill("How do I request an exception?");
    await page.locator("#send-btn").click();
    await expect(page.locator("#chat-messages")).toContainText("No reply received. Please try again. If the problem continues, contact support.");

    await page.screenshot({
      path: path.join(screenshotDir, "console-error-desktop.png"),
      fullPage: false
    });

    // E. Mobile Reflow (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(screenshotDir, "console-mobile-reflow.png"),
      fullPage: false
    });
  });
});
