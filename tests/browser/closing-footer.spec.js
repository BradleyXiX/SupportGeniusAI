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

    // Off-white background check (#ecebe5 is rgb(236, 235, 229), v3 paper #F7F5F3 is rgb(247, 245, 243))
    const bg = await closing.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(['rgb(236, 235, 229)', 'rgb(247, 245, 243)']).toContain(bg);
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
    // #242827 is rgb(36, 40, 39), v3 focus-light #18181C is rgb(24, 24, 28)
    expect(['rgb(36, 40, 39)', 'rgb(24, 24, 28)']).toContain(outlineStyles.outlineColor);
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

  test('5. Exhaustive link verification: all header, in-page, CTA, contact, and footer destinations exist', async ({ page }) => {
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
      } else if (link.href.startsWith('mailto:')) {
        expect(link.href).toMatch(/^mailto:BradJohn70@gmail\.com(\?subject=SupportGenius%20AI%20implementation%20enquiry)?$/);
      } else if (link.href.startsWith('https://')) {
        expect(link.href).toMatch(/^https:\/\/(bradleychiwo\.netlify\.app|www\.linkedin\.com\/in\/bradley-john-chiwo|github\.com\/BradleyXiX)\/?$/);
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

    // Hero secondary discuss link navigates to #implementation-contact
    const heroDiscuss = page.locator('.hero .actions a.button.secondary');
    await expect(heroDiscuss).toBeVisible();
    await expect(heroDiscuss).toHaveAttribute('href', '#implementation-contact');

    // Implementation contact mailto is visible
    const mailtoBtn = page.locator('#implementation-contact a.contact-email-btn');
    await expect(mailtoBtn).toBeVisible();
    await expect(mailtoBtn).toHaveAttribute(
      'href',
      'mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry'
    );

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

  test('10. Implementation contact block renders approved copy, mailto action, and selectable address', async ({ page }) => {
    await page.goto('/');

    const contact = page.locator('#implementation-contact');
    await expect(contact).toBeVisible();

    // Located inside closing copy column
    const insideClosingCopy = await page.evaluate(() => {
      const el = document.getElementById('implementation-contact');
      return el ? el.closest('.closing-copy') !== null : false;
    });
    expect(insideClosingCopy).toBe(true);

    // Approved heading and copy
    await expect(contact.locator('h3#contact-heading')).toHaveText('Want this for your business?');
    await expect(contact.locator('.contact-copy')).toHaveText(
      'Tell me about your support workflow and the documents you want your assistant to use.'
    );

    // Email link with exact encoded subject
    const emailBtn = contact.locator('a.contact-email-btn');
    await expect(emailBtn).toBeVisible();
    await expect(emailBtn).toHaveAttribute(
      'href',
      'mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry'
    );
    await expect(emailBtn).toContainText('Discuss implementation');

    // 44px min touch target
    const btnBox = await emailBtn.boundingBox();
    expect(btnBox.height).toBeGreaterThanOrEqual(44);

    // Selectable address and explanation
    await expect(contact.locator('.contact-note')).toHaveText(
      'Opens your email app. You can also copy the address below.'
    );
    const address = contact.locator('.selectable-address');
    await expect(address).toBeVisible();
    await expect(address).toHaveText('BradJohn70@gmail.com');

    // Focus outline on secondary button inside closing
    await emailBtn.focus();
    const focusStyles = await emailBtn.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        outlineStyle: computed.outlineStyle,
        outlineColor: computed.outlineColor,
        outlineWidth: computed.outlineWidth,
      };
    });
    expect(focusStyles.outlineStyle).not.toBe('none');
    expect(parseInt(focusStyles.outlineWidth)).toBeGreaterThanOrEqual(2);
  });

  test('11. Footer renders Built by Bradley Chiwo and 44px touch targets for professional profiles', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('.site-footer');
    await expect(footer).toBeVisible();

    // Author credit
    const author = footer.locator('.footer-author');
    await expect(author).toHaveText('Built by Bradley Chiwo');

    // Expected professional profiles
    const expectedProfiles = [
      { text: 'Email', href: 'mailto:BradJohn70@gmail.com', newTab: false },
      { text: 'Portfolio', href: 'https://bradleychiwo.netlify.app/', newTab: true },
      { text: 'LinkedIn', href: 'https://www.linkedin.com/in/bradley-john-chiwo/', newTab: true },
      { text: 'GitHub', href: 'https://github.com/BradleyXiX', newTab: true },
    ];

    for (const profile of expectedProfiles) {
      const link = footer.locator(`a[href="${profile.href}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(profile.text);

      if (profile.newTab) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }

      // Check 44px touch target
      const box = await link.boundingBox();
      expect(box.height, `Link ${profile.text} height should be >= 44px`).toBeGreaterThanOrEqual(44);

      // Check focus visibility
      await link.focus();
      const outline = await link.evaluate(el => window.getComputedStyle(el).outlineStyle);
      expect(outline).not.toBe('none');
    }
  });

  test('12. In-page navigation: hero secondary link scrolls to #implementation-contact', async ({ page }) => {
    await page.goto('/');

    const heroSecondary = page.locator('.hero .actions a.button.secondary');
    await expect(heroSecondary).toBeVisible();
    await expect(heroSecondary).toHaveAttribute('href', '#implementation-contact');
    await expect(heroSecondary).toContainText('Discuss implementation');

    // Click secondary button
    await heroSecondary.click();

    // Target is in viewport or URL hash updated
    await expect(page).toHaveURL(/#implementation-contact$/);
    const contact = page.locator('#implementation-contact');
    await expect(contact).toBeInViewport();
  });

  test('13. Capture visual evidence of implementation contact, footer, and hero actions', async ({ page }) => {
    // 1. Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Hero actions desktop
    const heroActions = page.locator('.hero .actions');
    await heroActions.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-hero-actions-desktop.png',
      clip: { x: 0, y: 0, width: 1440, height: 720 },
    });

    // Implementation contact desktop
    const contact = page.locator('#implementation-contact');
    await contact.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-implementation-desktop.png',
    });

    // Footer desktop
    const footer = page.locator('.site-footer');
    await footer.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-footer-desktop.png',
    });

    // 2. Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const heroActionsMobile = page.locator('.hero .actions');
    await heroActionsMobile.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-hero-actions-mobile.png',
      clip: { x: 0, y: 0, width: 390, height: 600 },
    });

    const contactMobile = page.locator('#implementation-contact');
    await contactMobile.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-implementation-mobile.png',
    });

    const footerMobile = page.locator('.site-footer');
    await footerMobile.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'docs/design-v3/screenshots/contact-footer-mobile.png',
    });
  });

});
