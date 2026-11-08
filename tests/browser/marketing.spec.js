import { test, expect } from "@playwright/test";

test.describe("Marketing Editorial Introduction (GET /)", () => {
  test("direct GET / loads marketing document with data-page='marketing' and zero CSP violations", async ({ page }) => {
    const cspViolations = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
        cspViolations.push(msg.text());
      }
    });

    const response = await page.goto("/");
    expect(response.status()).toBe(200);

    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-page", "marketing");

    expect(cspViolations).toEqual([]);
  });

  test("displays approved headline, copy, and demonstration/illustration disclosure", async ({ page }) => {
    await page.goto("/");

    // Headline & sub-copy
    await expect(page.locator("h1")).toContainText("Your knowledge. A clearer answer.");
    await expect(page.getByText(/A support assistant configured around your documentation and workflows/i)).toBeVisible();

    // Demonstration disclosure
    await expect(page.getByText(/SupportGeniusAI demonstration/i).first()).toBeVisible();

    // Illustration label for the diagram
    await expect(page.getByText(/Illustration/i).first()).toBeVisible();
  });

  test("all CTAs link to /console/ and no empty hrefs or fake contact forms exist", async ({ page }) => {
    await page.goto("/");

    // Verify all primary links to console
    const consoleLinks = page.locator("a[href='/console/'], a[href='/console']");
    const count = await consoleLinks.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least header/hero and closing CTA

    // Check no href="#" links exist
    const emptyLinks = page.locator("a[href='#']");
    await expect(emptyLinks).toHaveCount(0);

    // Check no fake lead capture or contact form exists
    const contactForms = page.locator("form[action*='contact'], form[action*='lead']");
    await expect(contactForms).toHaveCount(0);

    // Clicking primary CTA reaches /console/
    const heroCta = consoleLinks.first();
    await heroCta.click();
    await page.waitForURL("**/console/");
    expect(page.url()).toContain("/console");
  });

  test("anchor 'How it works' links to valid in-page content", async ({ page }) => {
    await page.goto("/");

    const howItWorksLink = page.locator("a[href='#how-it-works']").first();
    await expect(howItWorksLink).toBeVisible();

    const targetSection = page.locator("#how-it-works");
    await expect(targetSection).toBeAttached();
    await expect(targetSection).toBeVisible();
  });

  test("displays three stacked explanation rows and three deployment strip items", async ({ page }) => {
    await page.goto("/");

    // 3 explanation rows
    await expect(page.getByText(/Connect approved knowledge/i)).toBeVisible();
    await expect(page.getByText(/Answer with context/i)).toBeVisible();
    await expect(page.getByText(/Connect verified actions/i)).toBeVisible();
    await expect(page.getByText(/actions require client integration/i)).toBeVisible();

    // Deployment strip items
    await expect(page.getByText(/Configured for your business/i)).toBeVisible();
    await expect(page.getByText(/Local or hosted model options/i)).toBeVisible();
    await expect(page.getByText(/Maintained with your documentation/i)).toBeVisible();
  });

  test("content remains visible and complete with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Your knowledge. A clearer answer.");
    await expect(page.getByText(/Connect approved knowledge/i)).toBeVisible();

    const consoleLink = page.locator("a[href='/console/'], a[href='/console']").first();
    await expect(consoleLink).toBeVisible();

    await context.close();
  });

  test("captures desktop and mobile marketing screenshots", async ({ page }) => {
    // Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.screenshot({ path: "docs/design-prompts/screenshots/marketing-desktop.png", fullPage: true });

    // Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.screenshot({ path: "docs/design-prompts/screenshots/marketing-mobile.png", fullPage: true });
  });
});

