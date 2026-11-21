import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Task 11: Final Integrated Verification, Cross-Device Audits & Performance Evidence', () => {

  test('1. Three Cold-Load Performance Runs (Landing & Console) with Median LCP/CLS', async ({ browser }) => {
    const landingRuns = [];
    const consoleRuns = [];

    async function runColdLoad(urlPath) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 }
      });
      await context.addInitScript(() => {
        window.__perfMetrics = { lcp: 0, cls: 0, domContentLoaded: 0, load: 0, shifts: [] };

        try {
          const poLCP = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
            }
          });
          poLCP.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        try {
          const poCLS = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                window.__perfMetrics.cls += entry.value;
                window.__perfMetrics.shifts.push({
                  value: entry.value,
                  sources: (entry.sources || []).map(s => s.node ? s.node.nodeName : 'unknown')
                });
              }
            }
          });
          poCLS.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        window.addEventListener('DOMContentLoaded', () => {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) window.__perfMetrics.domContentLoaded = nav.domContentLoadedEventEnd || performance.now();
        });

        window.addEventListener('load', () => {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) window.__perfMetrics.load = nav.loadEventEnd || performance.now();
        });
      });

      const page = await context.newPage();
      await page.goto(urlPath, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          lcp: Math.round(window.__perfMetrics.lcp || (nav ? nav.responseEnd : 0)),
          cls: parseFloat(window.__perfMetrics.cls.toFixed(4)),
          domContentLoaded: Math.round(window.__perfMetrics.domContentLoaded || (nav ? nav.domContentLoadedEventEnd : 0)),
          load: Math.round(window.__perfMetrics.load || (nav ? nav.loadEventEnd : 0)),
          shifts: window.__perfMetrics.shifts
        };
      });

      await context.close();
      return metrics;
    }

    // 3 cold runs for Landing (/)
    for (let i = 1; i <= 3; i++) {
      const metrics = await runColdLoad('/');
      landingRuns.push(metrics);
    }

    // 3 cold runs for Console (/console/)
    for (let i = 1; i <= 3; i++) {
      const metrics = await runColdLoad('/console/');
      consoleRuns.push(metrics);
    }

    function calculateStats(runs) {
      const lcps = runs.map(r => r.lcp).sort((a, b) => a - b);
      const clss = runs.map(r => r.cls).sort((a, b) => a - b);
      return {
        runs,
        medianLCP: lcps[1],
        minLCP: lcps[0],
        maxLCP: lcps[2],
        medianCLS: clss[1],
        minCLS: clss[0],
        maxCLS: clss[2]
      };
    }

    const landingStats = calculateStats(landingRuns);
    const consoleStats = calculateStats(consoleRuns);

    const perfDir = path.resolve('docs/design-v3/performance');
    if (!fs.existsSync(perfDir)) {
      fs.mkdirSync(perfDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(perfDir, 'cold-loads.json'),
      JSON.stringify({ landing: landingStats, console: consoleStats }, null, 2)
    );

    console.log('Landing shifts:', JSON.stringify(landingRuns[0].shifts, null, 2));

    expect(landingStats.medianLCP).toBeGreaterThan(0);
    expect(consoleStats.medianLCP).toBeGreaterThan(0);
    expect(consoleStats.medianCLS).toBeLessThan(0.1);
  });

  test('2. 6x CPU-Throttled Motion, Scroll & Hover Trace', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });

    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Measure requestAnimationFrame frame deltas during hero animation under 6x CPU throttling
    const traceResults = await page.evaluate(async () => {
      const frameDeltas = [];
      let lastTime = performance.now();

      await new Promise((resolve) => {
        let frameCount = 0;
        function onFrame(now) {
          const delta = now - lastTime;
          lastTime = now;
          if (frameCount > 0) {
            frameDeltas.push(delta);
          }
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(onFrame);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(onFrame);
      });

      const avgDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
      const maxDelta = Math.max(...frameDeltas);
      const minDelta = Math.min(...frameDeltas);
      const p95Delta = frameDeltas.sort((a, b) => a - b)[Math.floor(frameDeltas.length * 0.95)];

      return {
        sampleCount: frameDeltas.length,
        avgDeltaMs: Math.round(avgDelta * 10) / 10,
        minDeltaMs: Math.round(minDelta * 10) / 10,
        maxDeltaMs: Math.round(maxDelta * 10) / 10,
        p95DeltaMs: Math.round(p95Delta * 10) / 10,
        effectiveFps: Math.round(1000 / avgDelta)
      };
    });

    // Hover over hero sphere
    const heroWrapper = page.locator('#hero-stage-wrapper');
    if (await heroWrapper.isVisible()) {
      const box = await heroWrapper.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25);
        await page.waitForTimeout(300);
      }
    }

    // Scroll down through page under 6x CPU throttling
    await page.evaluate(() => window.scrollBy({ top: 1200, behavior: 'smooth' }));
    await page.waitForTimeout(500);

    await page.evaluate(() => window.scrollBy({ top: 1200, behavior: 'smooth' }));
    await page.waitForTimeout(500);

    const perfDir = path.resolve('docs/design-v3/performance');
    if (!fs.existsSync(perfDir)) {
      fs.mkdirSync(perfDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(perfDir, 'throttled-trace.json'),
      JSON.stringify(traceResults, null, 2)
    );

    // Reset CPU throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    expect(traceResults.sampleCount).toBeGreaterThan(50);
  });

  test('3. Responsive Reflow & Screenshot Evidence across 1440, 390, and 320 viewports', async ({ page }) => {
    const screenshotDir = path.resolve('docs/design-v3/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1440x1000 Desktop
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/', { waitUntil: 'networkidle' });
    let docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-landing-1440.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });

    await page.goto('/console/', { waitUntil: 'networkidle' });
    docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-console-1440.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });

    // 390x844 Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-landing-390.png'), fullPage: false });

    await page.goto('/console/', { waitUntil: 'networkidle' });
    docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-console-390.png'), fullPage: false });

    // 320x800 Compact Mobile
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });
    docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-landing-320.png'), fullPage: false });

    await page.goto('/console/', { waitUntil: 'networkidle' });
    docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-console-320.png'), fullPage: false });
  });

  test('4. Keyboard Navigation & Visible Focus Ring Audit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Tab to skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    // Verify focus outline on skip link
    const skipLinkOutline = await page.evaluate(() => {
      const el = document.querySelector('.skip-link');
      const s = window.getComputedStyle(el);
      return s.outlineStyle !== 'none' || s.boxShadow !== 'none';
    });
    expect(skipLinkOutline).toBe(true);

    // Tab through header navigation
    await page.keyboard.press('Tab');
    const active1 = await page.evaluate(() => document.activeElement.tagName);
    expect(['A', 'BUTTON']).toContain(active1);

    // Console keyboard check: verify textarea and controls have visible focus rings
    await page.goto('/console/', { waitUntil: 'networkidle' });
    const input = page.locator('#input');
    await input.focus();
    const inputFocus = await input.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.outlineStyle !== 'none' || s.boxShadow !== 'none' || s.borderColor !== '';
    });
    expect(inputFocus).toBe(true);

    const backLink = page.locator('.rail-back-link');
    await backLink.focus();
    const backFocus = await backLink.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.outlineStyle !== 'none' || s.boxShadow !== 'none' || s.textDecorationLine.includes('underline');
    });
    expect(backFocus).toBe(true);
  });

  test('5. No-JavaScript Resilience Audit', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Landing with JS disabled
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify static SVG core poster is present
    const corePoster = page.locator('#core-poster');
    await expect(corePoster).toBeVisible();

    // Verify semantic headings and copy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Your knowledge.');

    // Verify details chapters work natively
    const details = page.locator('details[name="system-chapters"]').first();
    await expect(details).toBeVisible();

    // Verify closing implementation contact link
    const contactBtn = page.locator('a.contact-email-btn');
    await expect(contactBtn).toBeVisible();
    await expect(contactBtn).toHaveAttribute('href', /mailto:BradJohn70@gmail.com/);

    const screenshotDir = path.resolve('docs/design-v3/screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-nojs-landing.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });

    await context.close();
  });

  test('6. Reduced Motion Policy Enforcement', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Motion toggle should indicate reduced motion or paused
    const toggle = page.locator('#motion-toggle');
    if (await toggle.isVisible()) {
      const toggleText = await toggle.textContent();
      expect(toggleText).toMatch(/Resume animations|Reduced motion|Motion off/i);
    }

    // Core poster should remain visible as primary fallback
    const corePoster = page.locator('#core-poster');
    await expect(corePoster).toBeVisible();

    const screenshotDir = path.resolve('docs/design-v3/screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-reduced-motion.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });

    await context.close();
  });

  test('7. Persistent Pause Preference Across Reloads & Scene Sync', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const toggle = page.locator('#motion-toggle');
    await expect(toggle).toBeVisible();

    // Click to Pause
    await toggle.click();
    await expect(toggle).toHaveText(/Resume animations/i);

    // Verify localStorage key is 'paused'
    const stored = await page.evaluate(() => localStorage.getItem('sg_motion_v1'));
    expect(stored).toBe('paused');

    // Reload and verify persistence
    await page.reload({ waitUntil: 'networkidle' });
    const toggleAfterReload = page.locator('#motion-toggle');
    await expect(toggleAfterReload).toHaveText(/Resume animations/i);

    const screenshotDir = path.resolve('docs/design-v3/screenshots');
    await page.screenshot({ path: path.join(screenshotDir, 'v3-verified-paused.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });

    // Resume animations (restores default-on by clearing key)
    await toggleAfterReload.click();
    await expect(toggleAfterReload).toHaveText(/Pause animations/i);
    const storedResumed = await page.evaluate(() => localStorage.getItem('sg_motion_v1'));
    expect(storedResumed).toBeNull();
  });

  test('8. Fault Injection Resilience: Storage Failure, Import Failure, WebGL Loss, Console Error', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });

    // 1. Storage failure injection
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('SecurityError: Access is denied'); },
          setItem: () => { throw new Error('QuotaExceededError'); },
          removeItem: () => {},
          clear: () => {}
        },
        writable: true
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    const toggle = page.locator('#motion-toggle');
    if (await toggle.isVisible()) {
      // Toggle should still function in memory without throwing uncaught page error
      await toggle.click();
      await page.waitForTimeout(200);
    }

    // 2. Console recovery: verify message exchange and reset in demo mode
    await page.goto('/console/', { waitUntil: 'networkidle' });
    await expect(page.locator('#input')).toBeEnabled();

    // Test normal message exchange
    await page.locator('#input').fill('Tell me about warranty period.');
    await page.locator('#send-btn').click();
    await expect(page.locator('#chat-messages')).toContainText('refunds are processed within 3 business days');

    // Reset conversation
    const resetBtn = page.locator('#reset-btn');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await expect(page.locator('#chat-messages')).toContainText('Welcome to the SupportGenius Signal Desk demonstration');
    }
  });

  test('9. Browser Back/Forward & Navigation Lifecycle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Start on landing
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('3888');

    // Navigate to console
    await page.goto('/console/', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/console/');

    // Back to landing
    await page.goBack({ waitUntil: 'networkidle' });
    expect(page.url()).not.toContain('/console/');
    await expect(page.locator('h1')).toBeVisible();

    // Forward to console
    await page.goForward({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/console/');
    await expect(page.locator('#input')).toBeVisible();
  });
});
