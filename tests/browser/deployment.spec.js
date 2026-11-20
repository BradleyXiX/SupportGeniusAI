import { test, expect } from '@playwright/test';

test.describe('Task 07: Asymmetric Deployment Section (#deployment)', () => {

  test('1. Renders #deployment with asymmetric ruled grid, document stack, and model/control panels', async ({ page }) => {
    await page.goto('/#deployment');

    const deployment = page.locator('#deployment');
    await expect(deployment).toBeVisible();

    // Section header
    const eyebrow = deployment.locator('.eyebrow');
    await expect(eyebrow).toHaveText(/03 \/ BUILT AROUND YOUR BUSINESS/i);

    const title = deployment.locator('h2');
    await expect(title).toHaveText(/Your documents\.\s*Your deployment\./);

    // Asymmetric ruled grid
    const grid = deployment.locator('.deployment-grid');
    await expect(grid).toBeVisible();

    const mainPanel = grid.locator('.deploy-main');
    await expect(mainPanel).toBeVisible();
    await expect(mainPanel.locator('h3')).toHaveText(/The details\s*make the difference\./);

    // Side panels (Model Choice & Control)
    const sidePanels = grid.locator('.deploy-side article');
    await expect(sidePanels).toHaveCount(2);

    await expect(sidePanels.nth(0).locator('h3')).toHaveText(/Choose your model setup\./);
    await expect(sidePanels.nth(1).locator('h3')).toHaveText(/Clear operating boundaries\./);
  });

  test('2. Header navigation links to #deployment and targets the section', async ({ page }) => {
    await page.goto('/');

    const navLink = page.locator('.site-nav a[href="#deployment"]');
    await expect(navLink).toBeVisible();
    await expect(navLink).toHaveText('Deployment');

    await navLink.click();
    const deployment = page.locator('#deployment');
    await expect(deployment).toBeInViewport();
  });

  test('3. Document stack illustrates text/Markdown files, is aria-hidden, and has 3 items', async ({ page }) => {
    await page.goto('/#deployment');

    const stack = page.locator('#deployment .document-stack');
    await expect(stack).toBeVisible();
    await expect(stack).toHaveAttribute('aria-hidden', 'true');

    const items = stack.locator('> div');
    await expect(items).toHaveCount(3);

    await expect(items.nth(0)).toContainText('POLICIES.md');
    await expect(items.nth(0).locator('span')).toHaveText('01');

    await expect(items.nth(1)).toContainText('SHIPPING.md');
    await expect(items.nth(1).locator('span')).toHaveText('02');

    await expect(items.nth(2)).toContainText('HOURS.txt');
    await expect(items.nth(2).locator('span')).toHaveText('03');
  });

  test('4. Reduced motion flattens document-stack perspective transform', async ({ browser }) => {
    // Standard context
    const normalContext = await browser.newContext();
    const normalPage = await normalContext.newPage();
    await normalPage.goto('/#deployment');
    const defaultTransform = await normalPage.locator('#deployment .document-stack').evaluate(el => window.getComputedStyle(el).transform);
    expect(defaultTransform).not.toBe('none');
    await normalContext.close();

    // Reduced motion context
    const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto('/#deployment');
    const reducedTransform = await reducedPage.locator('#deployment .document-stack').evaluate(el => window.getComputedStyle(el).transform);
    expect(reducedTransform).toBe('none');
    await reducedContext.close();
  });

  test('5. Accessible heading hierarchy: h2 followed by h3 panels', async ({ page }) => {
    await page.goto('/#deployment');

    const deployment = page.locator('#deployment');
    const headings = await deployment.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements =>
      elements.map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent.trim() }))
    );

    expect(headings[0].tag).toBe('h2');
    expect(headings[0].text).toContain('Your documents.');

    expect(headings[1].tag).toBe('h3');
    expect(headings[1].text).toContain('The details');

    expect(headings[2].tag).toBe('h3');
    expect(headings[2].text).toContain('Choose your model setup.');

    expect(headings[3].tag).toBe('h3');
    expect(headings[3].text).toContain('Clear operating boundaries.');
  });

  test('6. Truthful copy: strictly disclaims uploads, live actions, certifications, and citations', async ({ page }) => {
    await page.goto('/#deployment');

    const sectionText = await page.locator('#deployment').innerText();

    // Positive truthful claims
    expect(sectionText).toContain('Policies. Shipping information. Service hours.');
    expect(sectionText).toContain('Configure OpenAI, Gemini, or Ollama.');
    expect(sectionText).toContain('Anonymous sessions, bounded requests, and explicit errors.');
    expect(sectionText).toContain('No live customer actions in this release.');

    // Negative prohibited claims (no fake proof, certifications, or upload interfaces)
    expect(sectionText).not.toMatch(/upload/i);
    expect(sectionText).not.toMatch(/drag and drop/i);
    expect(sectionText).not.toMatch(/pdf/i);
    expect(sectionText).not.toMatch(/live integration/i);
    expect(sectionText).not.toMatch(/soc\s*2|iso\s*27001|hipaa/i);
    expect(sectionText).not.toMatch(/trusted by \d+|99\.9%|99%/i);
  });

  test('7. Responsive reflow with zero horizontal scroll at 1440px, 390px, and 320px', async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop-1440' },
      { width: 390, height: 844, name: 'mobile-390' },
      { width: 320, height: 800, name: 'mobile-320' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#deployment');

      const deployment = page.locator('#deployment');
      await expect(deployment).toBeVisible();

      // Check document overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Overflow detected at ${vp.width}px`).toBe(false);

      // Verify grid layout reflow
      const isSingleColumn = await page.evaluate(() => {
        const grid = document.querySelector('.deployment-grid');
        const style = window.getComputedStyle(grid);
        return style.gridTemplateColumns.split(' ').length === 1;
      });

      if (vp.width <= 760) {
        expect(isSingleColumn, `Expected single-column grid at ${vp.width}px`).toBe(true);
      } else {
        expect(isSingleColumn, `Expected multi-column grid at ${vp.width}px`).toBe(false);
      }
    }
  });

});
