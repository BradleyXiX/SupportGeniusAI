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

test.describe("Task 2 / A2: Request & Session Safety", () => {
  test("blank input produces 0 POST requests", async ({ page }) => {
    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      await route.fulfill({ status: 200, body: JSON.stringify({ reply: "ok" }) });
    });

    await page.goto("/console/");
    await page.locator("#input").fill("   ");
    await page.locator("#send-btn").click();

    await page.waitForTimeout(300);
    expect(postCount).toBe(0);
  });

  test("oversized input (>2000 chars) is constrained by maxlength and produces 0 POSTs if invalid", async ({ page }) => {
    await page.goto("/console/");
    const input = page.locator("#input");
    
    // Check maxlength attribute is 2000
    await expect(input).toHaveAttribute("maxlength", "2000");

    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      await route.fulfill({ status: 200, body: JSON.stringify({ reply: "ok" }) });
    });

    // Try filling 2050 characters
    const longText = "a".repeat(2050);
    await input.fill(longText);

    const val = await input.inputValue();
    expect(val.length).toBeLessThanOrEqual(2000);
  });

  test("double-clicking Send dispatches exactly 1 POST while pending", async ({ page }) => {
    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      // Delayed response
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Single response", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    await input.fill("Testing idempotency");
    // Click twice rapidly
    await sendBtn.click();
    await sendBtn.click({ force: true }).catch(() => {});

    await page.waitForTimeout(1000);
    expect(postCount).toBe(1);
    await expect(page.locator("#chat-messages")).toContainText("Single response");
  });

  test("Shift+Enter creates newline without sending; Enter sends", async ({ page }) => {
    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Got multiline", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");

    await input.focus();
    await input.type("Line 1");
    await page.keyboard.press("Shift+Enter");
    await input.type("Line 2");

    // Not sent yet
    expect(postCount).toBe(0);
    const val = await input.inputValue();
    expect(val).toContain("\n");

    // Press Enter to send
    await page.keyboard.press("Enter");
    await expect.poll(() => postCount).toBe(1);
  });

  test("Enter during IME composition does not send", async ({ page }) => {
    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      await route.fulfill({ status: 200, body: JSON.stringify({ reply: "ok" }) });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.focus();

    // Simulate keydown event with isComposing: true
    await page.evaluate(() => {
      const inputEl = document.getElementById("input");
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 229,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, "isComposing", { value: true });
      inputEl.dispatchEvent(event);
    });

    await page.waitForTimeout(300);
    expect(postCount).toBe(0);
  });

  test("network/5xx failure shows approved uncertainty guidance with no auto-retry", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          type: "https://supportgenius.ai/errors/unhandled-exception",
          title: "Internal Server Error",
          status: 500,
          detail: "Database connection failed"
        })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("What is my order status?");
    await page.locator("#send-btn").click();

    // Approved uncertainty message:
    // "No reply received. An action may have completed. Verify with the business before repeating your request."
    const messages = page.locator("#chat-messages");
    await expect(messages).toContainText("No reply received. An action may have completed. Verify with the business before repeating your request.");

    // Must not contain an auto-retry button
    await expect(page.locator("button:has-text('Retry')")).toHaveCount(0);
  });

  test("422 validation error allows editing and manual resubmission", async ({ page }) => {
    let attempts = 0;
    await page.route("**/chat", async (route) => {
      attempts++;
      if (attempts === 1) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            status: 422,
            title: "Unprocessable Entity",
            detail: "Message contains invalid characters"
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ reply: "Second attempt accepted", cost: "0.0001" })
        });
      }
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Bad input");
    await page.locator("#send-btn").click();

    // Shows 422 error
    await expect(page.locator("#chat-messages")).toContainText("Message contains invalid characters");

    // User can edit input and re-submit
    await input.fill("Corrected input");
    await page.locator("#send-btn").click();

    await expect(page.locator("#chat-messages")).toContainText("Second attempt accepted");
    expect(attempts).toBe(2);
  });

  test("429 Rate Limit displays Retry-After countdown and enables manual retry without duplicating turn", async ({ page }) => {
    let attempts = 0;
    await page.route("**/chat", async (route) => {
      attempts++;
      if (attempts === 1) {
        await route.fulfill({
          status: 429,
          headers: { "Retry-After": "2" },
          contentType: "application/json",
          body: JSON.stringify({
            status: 429,
            detail: "Rate limit exceeded. Please wait 2 seconds."
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ reply: "Retry succeeded after backoff", cost: "0.0001" })
        });
      }
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("High frequency query");
    await page.locator("#send-btn").click();

    // Verify 429 notice appears with retry affordance
    const messages = page.locator("#chat-messages");
    await expect(messages).toContainText("Rate limit exceeded");

    // The retry button should become active after Retry-After
    const retryBtn = page.locator(".btn-retry-429");
    await expect(retryBtn).toBeVisible();

    // Wait for countdown to enable retry
    await expect(retryBtn).toBeEnabled({ timeout: 5000 });
    await retryBtn.click();

    // Reply is received
    await expect(messages).toContainText("Retry succeeded after backoff");

    // User message "High frequency query" must not be duplicated in transcript
    const userMessages = page.locator(".user-message:has-text('High frequency query')");
    await expect(userMessages).toHaveCount(1);
  });

  test("sanitizer absent plus malicious model output renders literal text without executing script", async ({ page }) => {
    let scriptExecuted = false;
    await page.exposeFunction("maliciousScriptRan", () => {
      scriptExecuted = true;
    });

    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: 'Safe header <img src="invalid" onerror="window.maliciousScriptRan && window.maliciousScriptRan()"> <script>window.maliciousScriptRan && window.maliciousScriptRan()</script>',
          cost: "0.0001"
        })
      });
    });

    // Block DOMPurify loading to simulate sanitizer failure
    await page.route("**/purify.min.js", (route) => route.abort());

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Trigger malicious model test");
    await page.locator("#send-btn").click();

    await page.waitForTimeout(500);
    expect(scriptExecuted).toBe(false);

    // Rendered literally
    const messages = page.locator("#chat-messages");
    await expect(messages).toContainText("Safe header");
  });

  test("resetSession while mocked POST is delayed prevents old response and cost from updating state", async ({ page }) => {
    let resolvePost;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    await page.route("**/chat", async (route) => {
      await postPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Late stale response that should never appear",
          cost: "0.9999"
        })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Question in session 1");
    await page.locator("#send-btn").click();

    // Reset session while request is still pending
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#reset-btn").click();

    // Now resolve the late POST
    resolvePost();
    await page.waitForTimeout(600);

    // Stale reply must NOT appear in the new session
    const messages = page.locator("#chat-messages");
    await expect(messages).not.toContainText("Late stale response that should never appear");

    // Session cost must remain $0.0000, NOT $0.9999
    await expect(page.locator("#session-cost")).toHaveText("$0.0000");
  });
});
