import { test, expect } from '@playwright/test';

test.describe('Task 07: Closing Sphere & Scheduler Coordination', () => {
  test.afterEach(async ({ page }) => {
    try {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { window.scrollTo(0, 0); } catch {}
      });
    } catch {}
  });

  test('1. Renders closing sphere stage against paper background with headline and CTA preserved', async ({ page }) => {
    await page.goto('/');

    const closing = page.locator('.closing');
    await expect(closing).toBeVisible();

    // Verify paper background
    const bg = await closing.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(['rgb(247, 245, 243)', 'rgb(236, 235, 229)']).toContain(bg);

    // Verify copy is intact
    await expect(closing.locator('.eyebrow')).toHaveText(/KNOWLEDGE, MADE CLEAR\./);
    await expect(closing.locator('h2#closing-title')).toHaveText(/Make the next\s*question count\./);
    const cta = closing.locator('a.button.primary');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      'href',
      'mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry'
    );
    await expect(cta).toContainText('Discuss implementation');

    const secondary = closing.locator('a.closing-secondary-link');
    await expect(secondary).toBeVisible();
    await expect(secondary).toHaveAttribute('href', '/console/');
    await expect(secondary).toContainText('Try Signal Desk');

    // Verify stage and poster presence
    const stage = closing.locator('.closing-stage');
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute('aria-hidden', 'true');
    const poster = stage.locator('.closing-poster');
    await expect(poster).toHaveAttribute('src', '/assets/brand/closing-sphere-poster.svg');
  });

  test('2. WebGL light variant mounts with theme light and id closing-sphere', async ({ page }) => {
    await page.goto('/');

    // Scroll to closing section
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const canvas = page.locator('.closing-canvas');
    await expect(canvas).toBeAttached();

    // Verify controller theme and id
    const details = await page.evaluate(() => {
      const controller = window.__closingSphere;
      if (!controller) return null;
      const td = controller.getTeardown();
      if (!td) return null;
      return {
        id: td.getId ? td.getId() : null,
        theme: td.getTheme ? td.getTheme() : null,
        isDisposed: td.isDisposed ? td.isDisposed() : null
      };
    });

    expect(details).toBeTruthy();
    expect(details.id).toBe('closing-sphere');
    expect(details.theme).toBe('light');
    expect(details.isDisposed).toBe(false);
  });

  test('3. Synchronized pause and resume with shared motion policy', async ({ page }) => {
    await page.goto('/');

    // Scroll to closing
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Click pause on hero toggle
    const toggle = page.locator('#motion-toggle');
    await toggle.click();
    await expect(toggle).toHaveText('Resume animations');

    // Closing canvas should be hidden and poster visible
    const canvas = page.locator('.closing-canvas');
    const poster = page.locator('.closing-poster');
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();

    // Click resume
    await toggle.click();
    await expect(toggle).toHaveText('Pause animations');
    await page.waitForTimeout(300);

    // Closing canvas should re-activate
    await expect(canvas).toBeVisible();
  });

  test('4. Stored pause preference persists to closing sphere on page reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('sg_motion_v1', 'paused');
    });

    await page.reload();
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const canvas = page.locator('.closing-canvas');
    const poster = page.locator('.closing-poster');
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();

    // Clean up stored preference
    await page.evaluate(() => {
      try { localStorage.removeItem('sg_motion_v1'); } catch {}
    });
  });

  test('5. OS reduced motion overrides WebGL and shows static SVG poster fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const canvas = page.locator('.closing-canvas');
    const poster = page.locator('.closing-poster');

    // Canvas must be hidden and poster must be visible
    await expect(canvas).toBeHidden();
    await expect(poster).toBeVisible();
  });

  test('6. Offscreen and tab visibility suspension', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // When at top (hero), closing section is offscreen
    const isClosingVisibleInitial = await page.evaluate(() => {
      const controller = window.__closingSphere;
      if (!controller) return false;
      const td = controller.getTeardown();
      return td && td.isVisible ? td.isVisible() : false;
    });
    expect(isClosingVisibleInitial).toBe(false);

    // Scroll closing into view
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const isClosingVisibleScrolled = await page.evaluate(() => {
      const controller = window.__closingSphere;
      if (!controller) return false;
      const td = controller.getTeardown();
      return td && td.isVisible ? td.isVisible() : false;
    });
    expect(isClosingVisibleScrolled).toBe(true);

    // Simulate tab hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);

    const isPausedHidden = await page.evaluate(() => {
      const controller = window.__closingSphere;
      if (!controller) return false;
      const td = controller.getTeardown();
      return td && td.isPaused ? td.isPaused() : false;
    });
    expect(isPausedHidden).toBe(true);

    // Restore tab visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });

  test('7. Scene registry coordinates hero, closing, and network textures without single-boolean conflicts', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('#signal-core')).toBeVisible();

    // At top of page: hero is visible, closing is offscreen
    const stateAtTop = await page.evaluate(async () => {
      const mp = await import('/marketing/motion-policy.js');
      const nt = await import('/marketing/network-texture.js');
      return {
        isLargeSceneActive: mp.isAnyLargeSceneActive(),
        activeScenes: mp.getActiveScenes().map(s => s.id),
        primaryScene: mp.getPrimaryActiveScene(),
        isNetworkYielding: nt.isLargeSphereActive()
      };
    });

    // Hero sphere is active, so network textures yield
    expect(stateAtTop.isLargeSceneActive).toBe(true);
    expect(stateAtTop.activeScenes).toContain('hero-sphere');
    expect(stateAtTop.isNetworkYielding).toBe(true);

    // Scroll to middle (#system) where neither hero nor closing is in view
    await page.locator('#system').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const stateAtMiddle = await page.evaluate(async () => {
      const mp = await import('/marketing/motion-policy.js');
      const nt = await import('/marketing/network-texture.js');
      return {
        isLargeSceneActive: mp.isAnyLargeSceneActive(),
        activeScenes: mp.getActiveScenes().map(s => s.id),
        isNetworkYielding: nt.isLargeSphereActive()
      };
    });

    // Neither large sphere in view -> network texture runs
    expect(stateAtMiddle.activeScenes).not.toContain('hero-sphere');
    expect(stateAtMiddle.activeScenes).not.toContain('closing-sphere');
    expect(stateAtMiddle.isLargeSceneActive).toBe(false);
    expect(stateAtMiddle.isNetworkYielding).toBe(false);

    // Scroll to closing section
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const stateAtClosing = await page.evaluate(async () => {
      const mp = await import('/marketing/motion-policy.js');
      const nt = await import('/marketing/network-texture.js');
      return {
        isLargeSceneActive: mp.isAnyLargeSceneActive(),
        activeScenes: mp.getActiveScenes().map(s => s.id),
        isNetworkYielding: nt.isLargeSphereActive()
      };
    });

    // Closing sphere is active -> network texture yields
    expect(stateAtClosing.activeScenes).toContain('closing-sphere');
    expect(stateAtClosing.isLargeSceneActive).toBe(true);
    expect(stateAtClosing.isNetworkYielding).toBe(true);
  });

  test('8. Release of scheduler ownership on pause, dispose, and page navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Dispose closing sphere
    await page.evaluate(() => {
      if (window.__closingSphere) {
        window.__closingSphere.dispose();
      }
    });

    const activeAfterDispose = await page.evaluate(async () => {
      const mp = await import('/marketing/motion-policy.js');
      return mp.getActiveScenes().map(s => s.id);
    });
    expect(activeAfterDispose).not.toContain('closing-sphere');

    // Simulate pagehide
    await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    const activeAfterPageHide = await page.evaluate(async () => {
      const mp = await import('/marketing/motion-policy.js');
      return mp.getActiveScenes();
    });
    expect(activeAfterPageHide.length).toBe(0);
  });

  test('9. Mobile reflow (390px and 320px): stacks poster beneath CTA, zero overflow', async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const closing = page.locator('.closing');
      await closing.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Verify canvas is hidden and poster is displayed
      const canvas = closing.locator('.closing-canvas');
      const poster = closing.locator('.closing-poster');
      await expect(canvas).toBeHidden();
      await expect(poster).toBeVisible();

      // Check vertical ordering: poster is below CTA
      const ctaBox = await closing.locator('a.button.primary').boundingBox();
      const posterBox = await poster.boundingBox();
      expect(ctaBox).toBeTruthy();
      expect(posterBox).toBeTruthy();
      expect(posterBox.y).toBeGreaterThan(ctaBox.y + ctaBox.height);

      // Horizontal overflow check
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    }
  });

  test('10. Operable without JavaScript: static poster renders cleanly', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');

    const closing = page.locator('.closing');
    await expect(closing).toBeVisible();

    // Primary CTA is functional
    const cta = closing.locator('a.button.primary');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      'href',
      'mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry'
    );

    const secondary = closing.locator('a.closing-secondary-link');
    await expect(secondary).toBeVisible();
    await expect(secondary).toHaveAttribute('href', '/console/');

    // Poster fallback renders
    const poster = closing.locator('.closing-poster');
    await expect(poster).toBeVisible();

    await context.close();
  });

  test('11. Capture screenshot evidence for running, paused, and mobile states', async ({ page }) => {
    // 1. Desktop running
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const closingEl = page.locator('.closing');
    await closingEl.screenshot({
      path: 'docs/design-v3/screenshots/closing-sphere-desktop-running.png'
    });

    // 2. Desktop paused
    const toggle = page.locator('#motion-toggle');
    await toggle.click();
    await page.waitForTimeout(300);
    await closingEl.screenshot({
      path: 'docs/design-v3/screenshots/closing-sphere-desktop-paused.png'
    });

    // 3. Mobile reflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.closing').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await closingEl.screenshot({
      path: 'docs/design-v3/screenshots/closing-sphere-mobile-reflow.png'
    });

    // Clean up stored preference
    await page.evaluate(() => {
      try { localStorage.removeItem('sg_motion_v1'); } catch {}
    });
  });

});
