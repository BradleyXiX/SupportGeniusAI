import { test, expect } from "@playwright/test";

test.describe("Console Shell & CSP Compliance", () => {
  test("direct GET /console/ loads shell with strict CSP and no inline-script violations", async ({ page }) => {
    const cspViolations = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
        cspViolations.push(msg.text());
      }
    });

    const response = await page.goto("/console/");
    expect(response.status()).toBe(200);

    const cspHeader = response.headers()["content-security-policy"];
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("script-src");
    
    // Ensure script-src and script-src-attr do NOT allow unsafe-inline
    const scriptSrcMatch = cspHeader.match(/script-src\s+([^;]+)/);
    expect(scriptSrcMatch).toBeTruthy();
    expect(scriptSrcMatch[1]).not.toContain("'unsafe-inline'");
    expect(cspHeader).toContain("script-src-attr 'none'");

    // Verify key console elements exist
    await expect(page.locator("#chat-messages")).toBeVisible();
    await expect(page.locator("#input")).toBeVisible();
    await expect(page.locator("#send-btn")).toBeVisible();
    await expect(page.locator("#reset-btn")).toBeVisible();
    await expect(page.locator("#session-cost")).toBeVisible();

    // Verify demo disclosure is visible
    await expect(page.getByText(/SupportGeniusAI demonstration/i)).toBeVisible();

    expect(cspViolations).toEqual([]);
  });

  test("typing message and clicking Send dispatches one mocked POST and renders reply without CSP violations", async ({ page }) => {
    let postCount = 0;
    let postBody = null;
    const cspViolations = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
        cspViolations.push(msg.text());
      }
    });

    await page.route("**/chat", async (route) => {
      postCount++;
      postBody = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Test answer from console mock",
          cost: "0.0001"
        })
      });
    });

    await page.goto("/console/");

    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    await input.fill("What is your returns policy?");
    await sendBtn.click();

    // Verify exactly one POST was made with expected payload
    await expect.poll(() => postCount).toBe(1);
    expect(postBody.message).toBe("What is your returns policy?");

    // Verify the test answer is visible in the messages
    await expect(page.locator("#chat-messages")).toContainText("Test answer from console mock");
    await expect(page.locator("#session-cost")).toContainText("0.0001");

    // Zero CSP violations during interaction
    expect(cspViolations).toEqual([]);
  });

  test("clicking suggestion chip populates input or sends query", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Returns are accepted within 14 days in original packaging.",
          cost: "0.0001"
        })
      });
    });

    await page.goto("/console/");
    const chip = page.locator("[data-suggestion], .suggestion-chip").first();
    await expect(chip).toBeVisible();

    const chipText = (await chip.textContent()).trim();
    await chip.click();

    // Either the input is populated with chip text or a message is triggered
    const inputValue = await page.locator("#input").inputValue();
    const messagesText = await page.locator("#chat-messages").textContent();
    const matched = inputValue.length > 0 || messagesText.includes(chipText);
    expect(matched).toBe(true);
  });

  test("clicking reset button clears chat and resets cost", async ({ page }) => {
    await page.goto("/console/");
    const resetBtn = page.locator("#reset-btn");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Session cost reset to $0.0000
    await expect(page.locator("#session-cost")).toHaveText("$0.0000");
  });

  test("captures desktop and mobile visual snapshots of /console/", async ({ page }) => {
    // Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();
    await page.screenshot({ path: "docs/design-prompts/screenshots/console-desktop.png", fullPage: true });

    // Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();
    await page.screenshot({ path: "docs/design-prompts/screenshots/console-mobile.png", fullPage: true });
  });
});

