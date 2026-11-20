import { test, expect } from "@playwright/test";

test.describe("Task 06: Scripted Interactive Example Conversations (#experience)", () => {
  test("1. Renders off-white section with dark demo frame and three scenario buttons", async ({ page }) => {
    await page.goto("/");

    const experience = page.locator("#experience");
    await expect(experience).toBeVisible();

    // Verify background color is off-white (#ecebe5)
    const bgColor = await experience.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe("rgb(236, 235, 229)");

    // Demo frame inside has dark canvas background
    const demoFrame = experience.locator(".demo-frame");
    await expect(demoFrame).toBeVisible();
    const frameBg = await demoFrame.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(frameBg).toBe("rgb(28, 30, 32)");

    // Demo bar disclaimers
    const demoBar = experience.locator(".demo-bar");
    await expect(demoBar).toContainText("SIGNAL DESK");
    await expect(demoBar).toContainText("SCRIPTED EXAMPLE / NO API CALLS");

    // Three scenario buttons
    const scenarios = experience.locator(".scenario");
    expect(await scenarios.count()).toBe(3);
    await expect(scenarios.nth(0)).toContainText("Returns policy");
    await expect(scenarios.nth(1)).toContainText("Shipping times");
    await expect(scenarios.nth(2)).toContainText("Opening hours");
  });

  test("2. Initial selection is Returns policy with aria-pressed='true'", async ({ page }) => {
    await page.goto("/");

    const returnsBtn = page.locator(".scenario[data-example='returns']");
    const shippingBtn = page.locator(".scenario[data-example='shipping']");
    const hoursBtn = page.locator(".scenario[data-example='hours']");

    await expect(returnsBtn).toHaveAttribute("aria-pressed", "true");
    await expect(shippingBtn).toHaveAttribute("aria-pressed", "false");
    await expect(hoursBtn).toHaveAttribute("aria-pressed", "false");

    await expect(page.locator("#sample-question")).toHaveText("What is your returns policy?");
    await expect(page.locator("#sample-answer")).toContainText("In this sample policy, you can return an unused item");
  });

  test("3. Scenario switching updates text immediately and toggles aria-pressed", async ({ page }) => {
    await page.goto("/");

    const returnsBtn = page.locator(".scenario[data-example='returns']");
    const shippingBtn = page.locator(".scenario[data-example='shipping']");
    const hoursBtn = page.locator(".scenario[data-example='hours']");

    // Click Shipping times
    await shippingBtn.click();
    await expect(shippingBtn).toHaveAttribute("aria-pressed", "true");
    await expect(returnsBtn).toHaveAttribute("aria-pressed", "false");
    await expect(hoursBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#sample-question")).toHaveText("How long does shipping take?");
    await expect(page.locator("#sample-answer")).toContainText("standard delivery takes 3–5 business days");

    // Click Opening hours
    await hoursBtn.click();
    await expect(hoursBtn).toHaveAttribute("aria-pressed", "true");
    await expect(shippingBtn).toHaveAttribute("aria-pressed", "false");
    await expect(returnsBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#sample-question")).toHaveText("What are your opening hours?");
    await expect(page.locator("#sample-answer")).toContainText("Monday to Friday, 9am–5pm");

    // Click Returns policy back
    await returnsBtn.click();
    await expect(returnsBtn).toHaveAttribute("aria-pressed", "true");
    await expect(hoursBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#sample-question")).toHaveText("What is your returns policy?");
  });

  test("4. Rapid switching handles consecutive clicks deterministically without lag", async ({ page }) => {
    await page.goto("/");

    const returnsBtn = page.locator(".scenario[data-example='returns']");
    const shippingBtn = page.locator(".scenario[data-example='shipping']");
    const hoursBtn = page.locator(".scenario[data-example='hours']");

    for (let i = 0; i < 5; i++) {
      await shippingBtn.click();
      await hoursBtn.click();
      await returnsBtn.click();
    }

    await expect(returnsBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#sample-question")).toHaveText("What is your returns policy?");
    await expect(page.locator("#sample-answer")).toContainText("return an unused item in its original packaging within 14 days");
  });

  test("5. Zero network requests: clicking samples never issues /chat or /session calls", async ({ page }) => {
    const apiRequests = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/chat") || url.includes("/session") || url.includes("/upstream")) {
        apiRequests.push(url);
      }
    });

    await page.goto("/");

    // Click all scenarios multiple times
    await page.locator(".scenario[data-example='shipping']").click();
    await page.locator(".scenario[data-example='hours']").click();
    await page.locator(".scenario[data-example='returns']").click();

    // Verify absolutely zero backend chat or session calls were made
    expect(apiRequests).toEqual([]);
  });

  test("6. Keyboard navigation: scenarios toggle via Enter and Space with visible focus", async ({ page }) => {
    await page.goto("/");

    const shippingBtn = page.locator(".scenario[data-example='shipping']");
    await shippingBtn.focus();
    await page.keyboard.press("Enter");

    await expect(shippingBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#sample-question")).toHaveText("How long does shipping take?");

    const hoursBtn = page.locator(".scenario[data-example='hours']");
    await hoursBtn.focus();
    await page.keyboard.press("Space");

    await expect(hoursBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#sample-question")).toHaveText("What are your opening hours?");
  });

  test("7. Accessible live region and real assistant CTA pointing to /console/", async ({ page }) => {
    await page.goto("/");

    const conversationRegion = page.locator(".sample-conversation");
    await expect(conversationRegion).toHaveAttribute("aria-live", "polite");
    await expect(conversationRegion).toHaveAttribute("aria-atomic", "true");

    // CTA links to real /console/
    const cta = conversationRegion.locator("a.text-link");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/console/");

    // No citations, tool calls, or real order IDs
    const text = await page.locator("#experience").innerText();
    expect(text).not.toContain("Confidence:");
    expect(text).not.toContain("Tool call:");
    expect(text).not.toContain("Citation [");
    expect(text).not.toContain("Order #");
  });

  test("8. Safe text rendering via textContent prevents XSS injection", async ({ page }) => {
    await page.goto("/");

    const renderedSafely = await page.evaluate(async () => {
      const { initExamples, EXAMPLES } = await import("/marketing/examples.js");

      // Temporarily inject markup into test data
      EXAMPLES.custom = {
        question: "<img src=x onerror=window.__xss=true>",
        answer: "<b>Formatted</b> <script>window.__xss2=true</script>"
      };

      const btn = document.createElement("button");
      btn.dataset.example = "custom";
      btn.className = "scenario";
      document.querySelector(".scenario-list").appendChild(btn);

      initExamples();
      btn.click();

      const qText = document.querySelector("#sample-question").textContent;
      const qHtml = document.querySelector("#sample-question").innerHTML;
      const hasImgTag = document.querySelector("#sample-question img") !== null;

      btn.remove();
      delete EXAMPLES.custom;

      return {
        qText,
        hasImgTag,
        xssExecuted: window.__xss === true || window.__xss2 === true
      };
    });

    expect(renderedSafely.hasImgTag).toBe(false);
    expect(renderedSafely.xssExecuted).toBe(false);
    expect(renderedSafely.qText).toContain("<img src=x onerror=window.__xss=true>");
  });

  test("9. Responsive reflow with zero horizontal overflow at 1440px, 390px, 320px", async ({ page }) => {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const experience = page.locator("#experience");
      await expect(experience).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }
  });
});
