import { test, expect } from '@playwright/test';

test.describe('Task 08: Closing Journey & Branded Footer (.closing & .site-footer)', () => {

  test('1. Renders .closing section with off-white field, eyebrow, headline, and /console/ CTA', async ({ page }) => {
    await page.goto('/');

    const closing = page.locator('.closing');
    await expect(closing).toBeVisible();

    // Eyebrow and headline
    await expect(closing.locator('.eyebrow')).toHaveText(/KNOWLEDGE, MADE CLEAR\./);
    await expect(closing.locator('h2')).toHaveText(/Make the next\s*question count\./);

    // Primary CTA
    const cta = closing.locator('a.button.primary');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/console/');
    await expect(cta).toContainText('Explore Signal Desk');

    // Off-white background check
    const bg = await closing.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // #ecebe5 is rgb(236, 235, 229)
    expect(bg).toBe('rgb(236, 235, 229)');
  });

  test('2. Static decorative rings are aria-hidden, positioned behind text, and have pointer-events none', async ({ page }) => {
    await page.goto('/');

    const rings = page.locator('.closing-rings');
    await expect(rings).toBeVisible();
    await expect(rings).toHaveAttribute('aria-hidden', 'true');

    const styles = await rings.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        zIndex: computed.zIndex,
        pointerEvents: computed.pointerEvents,
        position: computed.position,
      };
    });

    expect(styles.zIndex).toBe('0');
    expect(styles.pointerEvents).toBe('none');
    expect(styles.position).toBe('absolute');

    // Content sits above rings
    const titleZIndex = await page.locator('.closing h2').evaluate(el => window.getComputedStyle(el).zIndex);
    expect(Number(titleZIndex)).toBeGreaterThan(0);
  });

  test('3. Dark visible focus outline on closing CTA against light background', async ({ page }) => {
    await page.goto('/');

    const cta = page.locator('.closing a.button.primary');
    await cta.focus();

    const outlineStyles = await cta.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        outlineStyle: computed.outlineStyle,
        outlineColor: computed.outlineColor,
        outlineWidth: computed.outlineWidth,
      };
    });

    expect(outlineStyles.outlineStyle).not.toBe('none');
    expect(parseInt(outlineStyles.outlineWidth)).toBeGreaterThanOrEqual(2);
    // #242827 is rgb(36, 40, 39)
    expect(outlineStyles.outlineColor).toBe('rgb(36, 40, 39)');
  });

  test('4. Branded footer renders identity mark, description, back-to-top, and copyright', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();

    // Brand link
    const brandLink = footer.locator('.brand-link');
    await expect(brandLink).toHaveAttribute('href', '#main-content');
    await expect(brandLink.locator('img')).toBeVisible();
    await expect(brandLink).toContainText('SupportGenius');

    // Tagline and copyright
    await expect(footer.locator('.fine').first()).toHaveText('Document-based support intelligence.');
    await expect(footer.locator('.copyright')).toContainText('© 2026 SupportGenius AI');

    // Back to top link
    const topLink = footer.locator('a.text-link');
    await expect(topLink).toHaveAttribute('href', '#main-content');
    await expect(topLink).toContainText('Back to top');
  });

  test('5. Exhaustive link verification: all header, in-page, CTA, and footer destinations exist', async ({ page }) => {
    await page.goto('/');

    const links = await page.locator('a[href]').evaluateAll(anchors =>
      anchors.map(a => ({
        text: a.textContent.trim(),
        href: a.getAttribute('href'),
      }))
    );

    // Verify there are no empty or broken hrefs
    for (const link of links) {
      expect(link.href).toBeTruthy();
      expect(link.href).not.toBe('#');

      if (link.href.startsWith('#')) {
        const targetId = link.href.substring(1);
        const targetExists = await page.locator(`#${targetId}`).count();
        expect(targetExists, `Target #${targetId} for link "${link.text}" must exist in DOM`).toBeGreaterThan(0);
      } else {
        // App routes
        expect(link.href).toMatch(/^\/(console\/)?$/);
      }
    }
  });

  test('6. Landmark roles, accessible heading hierarchy, and unique H1', async ({ page }) => {
    await page.goto('/');

    // Required landmarks
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer.site-footer')).toHaveCount(1);

    // Exactly one H1
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
    await expect(h1s).toHaveId('hero-title');

    // Valid heading hierarchy: no skipped levels
    const headingTags = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements =>
      elements.map(el => parseInt(el.tagName.substring(1)))
    );

    let maxLevelSeen = 1;
    for (const level of headingTags) {
      expect(level).toBeLessThanOrEqual(maxLevelSeen + 1);
      if (level > maxLevelSeen) {
        maxLevelSeen = level;
      }
    }
  });

  test('7. Truthful claims: zero unsupported testimonials, fake logos, or non-existent legal links', async ({ page }) => {
    await page.goto('/');

    const bodyText = await page.locator('body').innerText();

    // No fake customer logos or testimonials
    expect(bodyText).not.toMatch(/testimonial|what our customers say|trusted by fortune/i);
    expect(bodyText).not.toMatch(/privacy policy|terms of service|legal notice/i);

    // Ensure no broken customer logo img tags
    const logoImgs = page.locator('img[alt*="logo" i]');
    expect(await logoImgs.count()).toBe(0);
  });

  test('8. Operable without JavaScript: CTA and links navigate cleanly', async ({ browser }) => {
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const page = await noJsContext.newPage();
    await page.goto('/');

    // Closing CTA is visible and has correct destination
    const closingCta = page.locator('.closing a.button.primary');
    await expect(closingCta).toBeVisible();
    await expect(closingCta).toHaveAttribute('href', '/console/');

    // Back to top link
    const topLink = page.locator('.site-footer a.text-link');
    await expect(topLink).toBeVisible();
    await expect(topLink).toHaveAttribute('href', '#main-content');

    await noJsContext.close();
  });

  test('9. Responsive reflow with zero horizontal scroll at 1440px, 390px, and 320px', async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop-1440' },
      { width: 390, height: 844, name: 'mobile-390' },
      { width: 320, height: 800, name: 'mobile-320' },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      const closing = page.locator('.closing');
      await expect(closing).toBeVisible();

      const footer = page.locator('.site-footer');
      await expect(footer).toBeVisible();

      // Check document overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Overflow detected at ${vp.width}px`).toBe(false);
    }
  });

});
