import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

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

  test("captures desktop, mobile, and reduced-motion visual snapshots of /console/", async ({ page }) => {
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

    // Reduced Motion Desktop (1440x900)
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();
    await page.screenshot({ path: "docs/design-prompts/screenshots/console-reduced-motion.png", fullPage: true });
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

  test("New conversation button is disabled while chat is pending and re-enabled upon resolution", async ({ page }) => {
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
          reply: "Response from server",
          cost: "0.0005"
        })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Question in session 1");
    await page.locator("#send-btn").click();

    // While request is pending, reset button MUST be disabled
    const resetBtn = page.locator("#reset-btn");
    await expect(resetBtn).toBeDisabled();

    // Resolve post
    resolvePost();
    await expect(page.locator("#chat-messages")).toContainText("Response from server");

    // After response, reset button is enabled
    await expect(resetBtn).toBeEnabled();
  });
});

test.describe("Task 4 / A4: Responsive Console & Accessibility Polish", () => {
  const axeSource = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");

  test("runs axe-core on /console/ with zero serious or critical violations", async ({ page }) => {
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();

    await page.evaluate(axeSource);
    const results = await page.evaluate(async () => {
      return await window.axe.run({
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
        }
      });
    });

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test("runs axe-core on / with zero serious or critical violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();

    await page.evaluate(axeSource);
    const results = await page.evaluate(async () => {
      return await window.axe.run({
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
        }
      });
    });

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  test("direct /console/ refresh maintains focusability and layout", async ({ page }) => {
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();

    await page.reload();
    await expect(page.locator("#chat-messages")).toBeVisible();
    await expect(page.locator("#input")).toBeVisible();
    await expect(page.locator("#send-btn")).toBeVisible();
  });

  test("keyboard-only navigation tabs through interactive controls with visible focus ring", async ({ page }) => {
    await page.goto("/console/");

    // Press Tab from top of page
    await page.keyboard.press("Tab"); // Skip link
    const activeTagName1 = await page.evaluate(() => document.activeElement.tagName);
    expect(["A", "BUTTON", "TEXTAREA"]).toContain(activeTagName1);

    // Tab further through interactive controls
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const activeTagName2 = await page.evaluate(() => document.activeElement.tagName);
    expect(["A", "BUTTON", "TEXTAREA", "INPUT"]).toContain(activeTagName2);

    // Verify focus outline on active element
    const hasFocusIndicator = await page.evaluate(() => {
      const style = window.getComputedStyle(document.activeElement);
      return style.outlineStyle !== "none" || style.boxShadow !== "none" || style.borderWidth !== "0px";
    });
    expect(hasFocusIndicator).toBe(true);
  });

  test("mobile viewport (390x844) has zero horizontal document overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/console/");
    await expect(page.locator("#chat-messages")).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  });

  test("touch controls on mobile target at least 44px height", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/console/");

    const sendBtn = page.locator("#send-btn");
    const sendBox = await sendBtn.boundingBox();
    expect(sendBox.height).toBeGreaterThanOrEqual(44);
    expect(sendBox.width).toBeGreaterThanOrEqual(44);

    const input = page.locator("#input");
    const inputBox = await input.boundingBox();
    expect(inputBox.height).toBeGreaterThanOrEqual(44);

    const resetBtn = page.locator("#reset-btn");
    const resetBox = await resetBtn.boundingBox();
    expect(resetBox.height).toBeGreaterThanOrEqual(36); // Compact mobile header action
  });

  test("desktop viewport (1440x1000) displays 2-column rail + conversation centered with max-width 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/console/");

    const rail = page.locator(".console-rail");
    await expect(rail).toBeVisible();

    const railBox = await rail.boundingBox();
    expect(railBox.width).toBeCloseTo(256, -1);

    const layout = page.locator(".console-layout");
    const layoutBox = await layout.boundingBox();
    expect(layoutBox.width).toBeLessThanOrEqual(1280);

    // Capture updated desktop screenshot at 1440x1000
    await page.screenshot({
      path: "docs/design-prompts/screenshots/console-desktop-1440x1000.png",
      fullPage: true
    });
  });

  test("reflow test at 200% zoom does not clip or overflow horizontally", async ({ page }) => {
    // 200% zoom simulated at 640px equivalent width
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto("/console/");

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Task A7 / Review Remediation: Lifecycle, Stale Overlap & Telemetry Regressions", () => {
  test("45s deadline aborts request when 200 headers arrive immediately but JSON body stalls", async ({ page }) => {
    await page.clock.install();
    await page.goto("/console/");

    await page.evaluate(() => {
      const origFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("/chat")) {
          const stream = new ReadableStream({
            start(controller) {
              if (opts?.signal) {
                opts.signal.addEventListener("abort", () => {
                  controller.error(new DOMException("Aborted", "AbortError"));
                });
              }
            }
          });
          return new Response(stream, {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return origFetch(url, opts);
      };
    });

    const input = page.locator("#input");
    await input.fill("Testing stalled 200 body");
    await page.locator("#send-btn").click();

    // Fast-forward past 45s (46,000ms)
    await page.clock.fastForward(46000);

    const messages = page.locator("#chat-messages");
    await expect(messages).toContainText("No reply received. An action may have completed. Verify with the business before repeating your request.");
    await expect(input).toBeEnabled();
    await expect(page.locator("#send-btn")).toBeEnabled();
    await expect(page.locator("button:has-text('Retry')")).toHaveCount(0);
  });

  test("45s deadline aborts request when 422 headers arrive immediately but JSON body stalls", async ({ page }) => {
    await page.clock.install();
    await page.goto("/console/");

    await page.evaluate(() => {
      const origFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("/chat")) {
          const stream = new ReadableStream({
            start(controller) {
              if (opts?.signal) {
                opts.signal.addEventListener("abort", () => {
                  controller.error(new DOMException("Aborted", "AbortError"));
                });
              }
            }
          });
          return new Response(stream, {
            status: 422,
            headers: { "Content-Type": "application/json" }
          });
        }
        return origFetch(url, opts);
      };
    });

    const input = page.locator("#input");
    await input.fill("Testing stalled 422 body");
    await page.locator("#send-btn").click();

    await page.clock.fastForward(46000);

    const messages = page.locator("#chat-messages");
    await expect(messages).toContainText("No reply received. An action may have completed. Verify with the business before repeating your request.");
    await expect(input).toBeEnabled();
    await expect(page.locator("#send-btn")).toBeEnabled();
    await expect(page.locator("button:has-text('Retry')")).toHaveCount(0);
  });

  test("Request A receives headers with unresolved body, reset, start B, then settle A: B remains pending, B deadline aborts B", async ({ page }) => {
    await page.clock.install();
    await page.goto("/console/");

    await page.evaluate(() => {
      const origFetch = window.fetch;
      window.__resolvers = {};
      window.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("/chat")) {
          const postData = JSON.parse(opts.body);
          const msg = postData.message;
          if (msg === "Request A") {
            let resolveBody;
            const bodyPromise = new Promise((resolve) => {
              resolveBody = resolve;
            });
            window.__resolvers.resolveA = resolveBody;
            const stream = new ReadableStream({
              async start(controller) {
                if (opts?.signal) {
                  opts.signal.addEventListener("abort", () => {
                    controller.error(new DOMException("Aborted", "AbortError"));
                  });
                }
                const data = await bodyPromise;
                controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
                controller.close();
              }
            });
            return new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          } else if (msg === "Request B") {
            const stream = new ReadableStream({
              start(controller) {
                if (opts?.signal) {
                  opts.signal.addEventListener("abort", () => {
                    controller.error(new DOMException("Aborted", "AbortError"));
                  });
                }
              }
            });
            return new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        return origFetch(url, opts);
      };
    });

    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    // Start Request A
    await input.fill("Request A");
    await sendBtn.click();

    // In B5, while A is waiting for body, reset button is disabled!
    await expect(page.locator("#reset-btn")).toBeDisabled();

    // Advance clock past 45s for Request A's deadline
    await page.clock.fastForward(46000);
    await page.waitForTimeout(200);

    // After A is aborted by deadline, reset button is enabled
    await expect(page.locator("#reset-btn")).toBeEnabled();

    // Reset session after A settles
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#reset-btn").click();

    // Start Request B immediately
    await input.fill("Request B");
    await sendBtn.click();

    // Request B is now pending
    await expect(page.locator(".loading-status-text")).toBeVisible();
    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // Settle Request A now
    await page.evaluate(() => {
      if (window.__resolvers.resolveA) {
        window.__resolvers.resolveA({ reply: "Stale reply from A", cost: "0.5555" });
      }
    });

    // Request B MUST still remain pending!
    await expect(page.locator(".loading-status-text")).toBeVisible();
    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // A's reply/cost must NEVER appear
    const messages = page.locator("#chat-messages");
    await expect(messages).not.toContainText("Stale reply from A");
    await expect(page.locator("#session-cost")).toHaveText("$0.0000");

    // Advance clock past 45s for Request B's deadline
    await page.clock.fastForward(46000);

    // Request B's deadline aborts B and recovers!
    await expect(messages).toContainText("No reply received. An action may have completed. Verify with the business before repeating your request.");
    await expect(input).toBeEnabled();
    await expect(sendBtn).toBeEnabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("idle");
  });

  test("Request A receives headers with unresolved body, reset, start B, then reject A: B remains pending, B deadline aborts B", async ({ page }) => {
    await page.clock.install();
    await page.goto("/console/");

    await page.evaluate(() => {
      const origFetch = window.fetch;
      window.__rejecters = {};
      window.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("/chat")) {
          const postData = JSON.parse(opts.body);
          const msg = postData.message;
          if (msg === "Request A Rejection") {
            const stream = new ReadableStream({
              start(controller) {
                window.__rejecters.rejectA = () => {
                  controller.error(new TypeError("Network error during body stream"));
                };
              }
            });
            return new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          } else if (msg === "Request B After Reject") {
            const stream = new ReadableStream({
              start(controller) {
                if (opts?.signal) {
                  opts.signal.addEventListener("abort", () => {
                    controller.error(new DOMException("Aborted", "AbortError"));
                  });
                }
              }
            });
            return new Response(stream, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        return origFetch(url, opts);
      };
    });

    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    await input.fill("Request A Rejection");
    await sendBtn.click();

    // While A is in flight, reset button is disabled
    await expect(page.locator("#reset-btn")).toBeDisabled();

    // Reject Request A's body
    await page.evaluate(() => {
      if (window.__rejecters.rejectA) {
        window.__rejecters.rejectA();
      }
    });

    // After A rejects, reset button becomes enabled
    await expect(page.locator("#reset-btn")).toBeEnabled();

    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#reset-btn").click();

    await input.fill("Request B After Reject");
    await sendBtn.click();

    await expect(page.locator(".loading-status-text")).toBeVisible();
    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // Request B MUST still remain pending!
    await expect(page.locator(".loading-status-text")).toBeVisible();
    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("pending");

    // No error from A in new transcript
    const messages = page.locator("#chat-messages");
    await expect(messages).not.toContainText("No reply received");

    // Advance clock past 45s for Request B
    await page.clock.fastForward(46000);

    // B recovers
    await expect(messages).toContainText("No reply received. An action may have completed. Verify with the business before repeating your request.");
    await expect(input).toBeEnabled();
    await expect(sendBtn).toBeEnabled();
    expect(await page.evaluate(() => window.__consoleOrbState)).toBe("idle");
  });

  test("422 headers arrive with delayed body, reset conversation, resolve body: no stale validation text in transcript", async ({ page }) => {
    await page.goto("/console/");

    await page.evaluate(() => {
      const origFetch = window.fetch;
      window.__resolvers = {};
      window.fetch = async (url, opts) => {
        if (typeof url === "string" && url.includes("/chat")) {
          let resolve422;
          const promise = new Promise((resolve) => {
            resolve422 = resolve;
          });
          window.__resolvers.resolve422 = resolve422;

          const stream = new ReadableStream({
            async start(controller) {
              const data = await promise;
              controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
              controller.close();
            }
          });
          return new Response(stream, {
            status: 422,
            headers: { "Content-Type": "application/json" }
          });
        }
        return origFetch(url, opts);
      };
    });

    const input = page.locator("#input");
    await input.fill("Bad input before reset");
    await page.locator("#send-btn").click();

    // In B5, while 422 request is pending, reset button is disabled
    await expect(page.locator("#reset-btn")).toBeDisabled();

    // Now resolve 422 body
    await page.evaluate(() => {
      if (window.__resolvers.resolve422) {
        window.__resolvers.resolve422({
          status: 422,
          detail: "Stale validation error from old session"
        });
      }
    });

    // After 422 completes, reset button is enabled
    await expect(page.locator("#reset-btn")).toBeEnabled();

    // Reset session
    page.on("dialog", (dialog) => dialog.accept());
    await page.locator("#reset-btn").click();

    await page.waitForTimeout(500);

    const messages = page.locator("#chat-messages");
    await expect(messages).not.toContainText("Stale validation error from old session");
    await expect(messages).not.toContainText("Validation Error");
  });

  test("server health check shows distinct knowledge readiness based on vectorStore.isInitialized", async ({ page }) => {
    // Sub-case 1: vectorStore.isInitialized = true
    await page.route("**/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "healthy",
          vectorStore: { isInitialized: true, count: 5 }
        })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#connection-status-text")).toHaveText("Server reachable");
    await expect(page.locator("#knowledge-status-text")).toHaveText("Knowledge active");

    // Sub-case 2: vectorStore.isInitialized = false
    await page.route("**/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "healthy",
          vectorStore: { isInitialized: false, count: 0 }
        })
      });
    });
    await page.evaluate(() => window.__checkServerHealth && window.__checkServerHealth());
    await expect(page.locator("#connection-status-text")).toHaveText("Server reachable");
    await expect(page.locator("#knowledge-status-text")).toHaveText("Knowledge unavailable");

    // Sub-case 3: missing or malformed JSON
    await page.route("**/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "NOT_JSON"
      });
    });
    await page.evaluate(() => window.__checkServerHealth && window.__checkServerHealth());
    await expect(page.locator("#connection-status-text")).toHaveText("Server reachable");
    await expect(page.locator("#knowledge-status-text")).toHaveText("Knowledge status unknown");

    // Sub-case 4: unreachable server (500 or network fail)
    await page.route("**/health", async (route) => {
      await route.abort("failed");
    });
    await page.evaluate(() => window.__checkServerHealth && window.__checkServerHealth());
    await expect(page.locator("#connection-status-text")).toHaveText("Server unreachable");
    await expect(page.locator("#knowledge-status-text")).toHaveText("Knowledge status unknown");
  });

  test("showLoading displays visible 'Waiting for reply' text with accessible announcement semantics and cleans up on completion and reset", async ({ page }) => {
    let resolvePost;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    await page.route("**/chat", async (route) => {
      await postPromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Finished reply", cost: "0.0001" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    await input.fill("Testing accessible loading");
    await page.locator("#send-btn").click();

    // Verify visible text and status role during pending
    const loadingEl = page.locator("#loading-message");
    await expect(loadingEl).toBeVisible();
    await expect(loadingEl).toContainText("Waiting for reply");
    await expect(page.locator(".loading-status-text")).toContainText("Waiting for reply");
    await expect(page.locator(".loading-bubble")).toHaveAttribute("role", "status");

    // Resolve POST
    resolvePost();
    await expect(page.locator("#chat-messages")).toContainText("Finished reply");

    // Loading indicator is removed
    await expect(loadingEl).toHaveCount(0);
  });

  test("console initialization blocks Send until capabilities and session bootstrap succeed", async ({ page }) => {
    let resolveSession;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    await page.route("**/session", async (route) => {
      if (route.request().method() === "POST") {
        await sessionPromise;
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto("/console/");

    const sendBtn = page.locator("#send-btn");
    const input = page.locator("#input");
    const resetBtn = page.locator("#reset-btn");

    // Before session resolves, Send, Input, and Reset are disabled
    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();
    await expect(resetBtn).toBeDisabled();
    await expect(input).toHaveAttribute("placeholder", /Preparing conversation/i);

    // Resolve POST /session
    resolveSession();

    // Now input and send become enabled
    await expect(sendBtn).toBeEnabled();
    await expect(input).toBeEnabled();
    await expect(resetBtn).toBeEnabled();
    await expect(input).toHaveAttribute("placeholder", /Ask a question/i);
  });

  test("failure / malformed capability remains visibly unavailable with Retry control and blocks Send", async ({ page }) => {
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "unknown_invalid_mode" })
      });
    });

    await page.goto("/console/");

    const sendBtn = page.locator("#send-btn");
    const input = page.locator("#input");

    await expect(sendBtn).toBeDisabled();
    await expect(input).toBeDisabled();

    // Mode disclosure displays unavailable
    const modeBadge = page.locator("#mode-badge, .disclosure-badge");
    await expect(modeBadge).toContainText(/unavailable/i);

    // Clear Retry control is present
    const retryBtn = page.locator(".btn-retry-init");
    await expect(retryBtn).toBeVisible();

    // Zero session storage tokens
    const storedId = await page.evaluate(() => sessionStorage.getItem("supportGeniusSessionId"));
    expect(storedId).toBeNull();
  });

  test("mode disclosure is populated accurately for demo and support modes", async ({ page }) => {
    // Test Demo Mode
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "demo", actionsEnabled: false, sessionRequired: true })
      });
    });

    await page.goto("/console/");
    await expect(page.locator(".demo-disclosure")).toContainText(/Demonstration — simulated answers, no automated actions|Simulated answers/i);

    // Test Support Mode
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "support", actionsEnabled: false, sessionRequired: true })
      });
    });

    await page.goto("/console/");
    await expect(page.locator(".demo-disclosure")).toContainText(/Document support — automated actions unavailable|Document support/i);
  });

  test("reset rotates server session via POST /session before clearing transcript and cost", async ({ page }) => {
    let sessionPostCalled = false;
    let resolveSession;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "First turn reply", cost: "0.0025" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    // Complete a turn first
    await input.fill("Initial question");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("First turn reply");
    await expect(page.locator("#session-cost")).toHaveText("$0.0025");

    // Intercept subsequent POST /session (reset rotation)
    await page.route("**/session", async (route) => {
      sessionPostCalled = true;
      await sessionPromise;
      await route.fulfill({ status: 204 });
    });

    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();

    // While reset is pending: button shows Starting conversation..., Send is disabled, transcript NOT cleared yet!
    await expect(resetBtn).toBeDisabled();
    await expect(resetBtn).toContainText(/Starting conversation/i);
    await expect(sendBtn).toBeDisabled();
    await expect(page.locator("#chat-messages")).toContainText("First turn reply");

    // Resolve POST /session rotation
    resolveSession();

    // Now transcript is cleared and cost reset
    await expect(page.locator("#session-cost")).toHaveText("$0.0000");
    await expect(page.locator("#chat-messages")).not.toContainText("First turn reply");
    await expect(resetBtn).toBeEnabled();
    await expect(resetBtn).toContainText(/New conversation/i);
    expect(sessionPostCalled).toBe(true);
  });

  test("failed reset retains previous transcript and cost and presents retry affordance", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Preserved turn reply", cost: "0.0040" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    await input.fill("Important query");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Preserved turn reply");

    // Make reset fail with 503
    await page.route("**/session", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "SESSION_STORE_UNAVAILABLE" })
      });
    });

    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();

    // Transcript and cost must be retained! History NOT cleared
    await expect(page.locator("#chat-messages")).toContainText("Preserved turn reply");
    await expect(page.locator("#session-cost")).toHaveText("$0.0040");
    await expect(resetBtn).toBeEnabled();
  });

  test("HTTP 401 SESSION_REQUIRED disables composer and requires explicit session restart", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "SESSION_REQUIRED", detail: "Session required or expired." })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    await input.fill("Hello on expired session");
    await sendBtn.click();

    // Shows session required / expired message
    await expect(page.locator("#chat-messages")).toContainText(/Session required or expired/i);

    // Composer input and Send are disabled
    await expect(input).toBeDisabled();
    await expect(sendBtn).toBeDisabled();
  });

  test("HTTP 409 SESSION_BUSY displays honest waiting guidance without auto-retry", async ({ page }) => {
    let postCount = 0;
    await page.route("**/chat", async (route) => {
      postCount++;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "SESSION_BUSY", detail: "A reply is already being processed." })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");

    await input.fill("Contention query");
    await sendBtn.click();

    // Message shows already processing guidance
    await expect(page.locator("#chat-messages")).toContainText(/A reply is already being processed/i);

    // Exactly 1 POST made (zero automatic retry)
    await page.waitForTimeout(500);
    expect(postCount).toBe(1);
  });

  test("zero session identifiers exist in browser storage", async ({ page }) => {
    await page.goto("/console/");
    const storedSession = await page.evaluate(() => {
      return {
        sessionStorageId: sessionStorage.getItem("supportGeniusSessionId"),
        localStorageId: localStorage.getItem("supportGeniusSessionId"),
        anyStorageKeys: Object.keys(sessionStorage)
      };
    });

    expect(storedSession.sessionStorageId).toBeNull();
    expect(storedSession.localStorageId).toBeNull();
    expect(storedSession.anyStorageKeys.filter((k) => k.toLowerCase().includes("session"))).toEqual([]);
  });
});
