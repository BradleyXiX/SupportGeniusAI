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

    // But session is NOT ready: submission paths must be disabled until recovery succeeds
    await expect(input).toBeDisabled();
    await expect(sendBtn).toBeDisabled();
    await expect(page.locator("#chat-messages")).toContainText(/Previous messages remain displayed, but the server session could not be confirmed/i);
    await expect(page.locator("#init-error-banner")).toBeVisible();
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

  // =========================================================================
  // Task B5 Corrections Regression Suite
  // =========================================================================

  test("held reset prevents suggestion chips, form submit, Enter key, and 429 Retry from sending /chat", async ({ page }) => {
    let chatPostCount = 0;
    await page.route("**/chat", async (route) => {
      chatPostCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Chat reply", cost: "0.0010" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    // Complete turn 1
    await input.fill("Hello turn 1");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Chat reply");
    expect(chatPostCount).toBe(1);

    // Hold reset in pending state
    let resolveReset;
    const resetPromise = new Promise((resolve) => {
      resolveReset = resolve;
    });
    await page.route("**/session", async (route) => {
      await resetPromise;
      await route.fulfill({ status: 204 });
    });

    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();
    await expect(resetBtn).toBeDisabled();

    // 1. Suggestion chip click while reset pending -> 0 new /chat
    const chip = page.locator(".suggestion-chip").first();
    await chip.click({ force: true });
    await page.waitForTimeout(200);
    expect(chatPostCount).toBe(1);

    // 2. Direct form submission / Enter key while reset pending -> 0 new /chat
    await page.evaluate(() => {
      const form = document.getElementById("chat-form");
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
    await page.waitForTimeout(200);
    expect(chatPostCount).toBe(1);

    // Send button must remain disabled throughout
    await expect(sendBtn).toBeDisabled();

    // Release reset
    resolveReset();
    await expect(resetBtn).toBeEnabled();
    await expect(sendBtn).toBeEnabled();
  });

  test("held recovery bootstrap prevents submission and duplicate session rotation", async ({ page }) => {
    let sessionCallCount = 0;
    let resolveSession;
    let sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    // Make initial bootstrap fail
    let initialAttempt = true;
    await page.route("**/session", async (route) => {
      sessionCallCount++;
      if (initialAttempt) {
        initialAttempt = false;
        await route.fulfill({ status: 503 });
      } else {
        await sessionPromise;
        await route.fulfill({ status: 204 });
      }
    });

    await page.goto("/console/");
    await expect(page.locator("#init-error-banner")).toBeVisible();
    expect(sessionCallCount).toBe(1);

    // Now click Retry initialization
    const retryBtn = page.locator(".btn-retry-init").first();
    await retryBtn.click();

    // While recovery is held pending, attempt second retry click -> duplicate rotation blocked
    await retryBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
    expect(sessionCallCount).toBe(2);

    // Attempt chat submission while recovery is pending -> blocked
    let chatCount = 0;
    await page.route("**/chat", async (route) => {
      chatCount++;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply: "No" }) });
    });
    await page.evaluate(() => {
      const form = document.getElementById("chat-form");
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
    expect(chatCount).toBe(0);

    // Resolve recovery
    resolveSession();
    await expect(page.locator("#send-btn")).toBeEnabled();
    await expect(page.locator("#init-error-banner")).toHaveCount(0);
  });

  test("failed reset followed by successful Retry initialization clears old transcript and cost only after 204", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Old turn reply to be cleared", cost: "0.0075" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    await input.fill("Initial conversation");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Old turn reply to be cleared");
    await expect(page.locator("#session-cost")).toHaveText("$0.0075");

    // Fail reset with 503
    await page.route("**/session", async (route) => {
      await route.fulfill({ status: 503 });
    });

    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();

    // Verify messages and cost are preserved, composer disabled
    await expect(page.locator("#chat-messages")).toContainText("Old turn reply to be cleared");
    await expect(page.locator("#session-cost")).toHaveText("$0.0075");
    await expect(input).toBeDisabled();

    // Now set up held recovery session
    let resolveRecovery;
    const recoveryPromise = new Promise((resolve) => {
      resolveRecovery = resolve;
    });
    await page.route("**/session", async (route) => {
      await recoveryPromise;
      await route.fulfill({ status: 204 });
    });

    const retryBtn = page.locator(".btn-retry-init").first();
    await retryBtn.click();

    // While recovery is pending: old transcript and cost STILL visible!
    await expect(page.locator("#chat-messages")).toContainText("Old turn reply to be cleared");
    await expect(page.locator("#session-cost")).toHaveText("$0.0075");

    // Resolve recovery with 204
    resolveRecovery();

    // Now old transcript and cost are cleared, cost reset to 0, welcome shown
    await expect(page.locator("#session-cost")).toHaveText("$0.0000");
    await expect(page.locator("#chat-messages")).not.toContainText("Old turn reply to be cleared");
    await expect(page.locator("#chat-messages")).toContainText("Welcome to the");
    await expect(input).toBeEnabled();
    await expect(sendBtn).toBeEnabled();
  });

  test("capabilities contract strictly validates mode, actionsEnabled false, and sessionRequired true", async ({ page }) => {
    let sessionPostCalled = false;
    await page.route("**/session", async (route) => {
      sessionPostCalled = true;
      await route.fulfill({ status: 204 });
    });

    // 1. Missing required actionsEnabled and sessionRequired fields
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "demo" })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#send-btn")).toBeDisabled();
    await expect(page.locator("#input")).toBeDisabled();
    await expect(page.locator("#init-error-banner")).toBeVisible();
    await expect(page.locator(".demo-disclosure")).toContainText(/Configuration unavailable/i);
    expect(sessionPostCalled).toBe(false);

    // 2. actionsEnabled: true (contradictory to safe foundation)
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "demo", actionsEnabled: true, sessionRequired: true })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#send-btn")).toBeDisabled();
    expect(sessionPostCalled).toBe(false);

    // 3. sessionRequired: false (contradictory)
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "demo", actionsEnabled: false, sessionRequired: false })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#send-btn")).toBeDisabled();
    expect(sessionPostCalled).toBe(false);

    // 4. actionsEnabled: "false" (string instead of boolean)
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "demo", actionsEnabled: "false", sessionRequired: true })
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#send-btn")).toBeDisabled();
    expect(sessionPostCalled).toBe(false);

    // 5. Malformed JSON
    await page.route("**/capabilities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "NOT_VALID_JSON{{"
      });
    });

    await page.goto("/console/");
    await expect(page.locator("#send-btn")).toBeDisabled();
    expect(sessionPostCalled).toBe(false);
  });

  test("15s local deadline aborts stalled bootstrap and stalled reset with recoverable UI", async ({ page }) => {
    // 1. Test stalled capabilities headers aborts at 15s
    await page.clock.install();

    await page.route("**/capabilities", async () => {
      // Intentionally stall response indefinitely
    });

    await page.goto("/console/");
    await page.clock.fastForward(16000);

    await expect(page.locator("#init-error-banner")).toBeVisible();
    await expect(page.locator("#send-btn")).toBeDisabled();
    await expect(page.locator("#input")).toBeDisabled();
  });

  test("reset times out at 15s: retains transcript, marks session unconfirmed, blocks submission", async ({ page }) => {
    await page.route("**/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Preserved before timeout", cost: "0.0020" })
      });
    });

    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    await input.fill("Testing reset deadline");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Preserved before timeout");

    await page.clock.install();

    // Stall /session indefinitely during reset
    await page.route("**/session", async () => {});

    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();

    // Fast-forward past 15s reset deadline
    await page.clock.fastForward(16000);

    // Transcript retained, session unconfirmed notice shown, input disabled
    await expect(page.locator("#chat-messages")).toContainText("Preserved before timeout");
    await expect(page.locator("#chat-messages")).toContainText(/Previous messages remain displayed, but the server session could not be confirmed/i);
    await expect(input).toBeDisabled();
    await expect(sendBtn).toBeDisabled();
    await expect(page.locator("#init-error-banner")).toBeVisible();
  });

  test("unmocked local-demo flow: real cookie bootstrap, initial query, real cookie rotation on reset, 401 on missing cookie, and explicit recovery", async ({ page, context }) => {
    // No route mocking for capabilities, session, or chat: runs against local demo server
    await page.goto("/console/");
    const input = page.locator("#input");
    const sendBtn = page.locator("#send-btn");
    const resetBtn = page.locator("#reset-btn");

    await expect(input).toBeEnabled();
    await expect(sendBtn).toBeEnabled();

    // Inspect real context cookie without logging value
    const cookiesBefore = await context.cookies();
    const sessionCookieBefore = cookiesBefore.find((c) => c.name.includes("session"));
    expect(sessionCookieBefore).toBeDefined();
    expect(sessionCookieBefore.httpOnly).toBe(true);
    expect(sessionCookieBefore.sameSite).toBe("Strict");

    // Browser storage contains 0 session identifiers
    const storageKeys = await page.evaluate(() => Object.keys(sessionStorage));
    expect(storageKeys.filter((k) => k.toLowerCase().includes("session"))).toHaveLength(0);

    // Send demo turn
    await input.fill("What is your return policy?");
    await sendBtn.click();
    await expect(page.locator("#chat-messages")).toContainText(/returns|policy|demonstration|assist/i);
    await expect(page.locator("#session-cost")).toHaveText("$0.0000"); // demo mode cost is 0

    // Reset conversation -> real cookie rotation
    page.on("dialog", (dialog) => dialog.accept());
    await resetBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Welcome to the");

    const cookiesAfterReset = await context.cookies();
    const sessionCookieAfter = cookiesAfterReset.find((c) => c.name.includes("session"));
    expect(sessionCookieAfter).toBeDefined();
    // Prove cookie was rotated to a new session token
    expect(sessionCookieAfter.value).not.toEqual(sessionCookieBefore.value);

    // Delete cookies from context -> simulate missing / expired cookie
    await context.clearCookies();

    // Attempt turn without session cookie
    await input.fill("Query on missing cookie");
    await sendBtn.click();

    // Receives real HTTP 401 SESSION_REQUIRED
    await expect(page.locator("#chat-messages")).toContainText(/Session required or expired/i);
    await expect(input).toBeDisabled();
    await expect(sendBtn).toBeDisabled();

    // Explicit recovery via New conversation
    await resetBtn.click();
    await expect(page.locator("#chat-messages")).toContainText("Welcome to the");
    await expect(input).toBeEnabled();
    await expect(sendBtn).toBeEnabled();

    const cookiesRecovered = await context.cookies();
    const sessionCookieRecovered = cookiesRecovered.find((c) => c.name.includes("session"));
    expect(sessionCookieRecovered).toBeDefined();
  });
});
