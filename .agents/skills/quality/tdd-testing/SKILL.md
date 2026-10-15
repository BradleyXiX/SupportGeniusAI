---
name: tdd-testing
description: Test-driven development methodology using Vitest and Playwright, mandating edge-case unit tests authored prior to code delivery and accessibility assertions.
---

# Test-Driven Development (TDD) & Quality Engineering

The `tdd-testing` skill mandates the Red-Green-Refactor discipline across all development in SupportGeniusAI. Tests are not retroactive artifacts written after shipping code; they are formal specifications that define correctness, prevent regressions, and enforce domain boundaries.

---

## 1. The Red-Green-Refactor Protocol

Agents must strictly follow the three-phase TDD lifecycle:

```
  ┌───────────────────────────────────────────────────────────┐
  │ 1. RED: Write a failing test specifying expected behavior │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 2. GREEN: Implement minimal code required to pass test    │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 3. REFACTOR: Clean architecture, optimize, purge debt      │
  └───────────────────────────────────────────────────────────┘
```

1. **Phase 1: RED (Specification First)**:
   - Formulate the test case covering expected outputs, boundary conditions, and failure states.
   - Run the test suite and confirm it fails for the expected reason (not due to syntax or import errors).
2. **Phase 2: GREEN (Minimal Implementation)**:
   - Write the simplest, most direct code that fulfills the test assertion.
   - Do not prematurely engineer auxiliary features.
3. **Phase 3: REFACTOR (Design Optimization)**:
   - Eliminate code duplication, improve naming, ensure proper separation of concerns.
   - Re-run test suite after every refactoring edit to confirm zero behavioral regressions.

---

## 2. Unit & Integration Testing with Vitest

Unit tests must execute with high velocity, isolate external I/O via mocking, and validate comprehensive edge-case matrices.

### Complete Vitest Service Test Example

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketRoutingService } from './ticketRoutingService.js';
import { ProblemError } from '../utils/problemError.js';

describe('TicketRoutingService', () => {
  let service;
  let mockClassifier;
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifier = {
      classifyIntent: vi.fn(),
    };
    mockDb = {
      tickets: {
        update: vi.fn(),
      },
    };
    service = new TicketRoutingService({ classifier: mockClassifier, db: mockDb });
  });

  it('routes high-priority billing tickets to the tier-3 billing queue', async () => {
    // Arrange
    const ticket = { id: 'tick_123', content: 'Urgent: Double charged on invoice #901' };
    mockClassifier.classifyIntent.mockResolvedValue({
      category: 'BILLING',
      urgency: 'HIGH',
      confidence: 0.98,
    });
    mockDb.tickets.update.mockResolvedValue({ id: 'tick_123', queue: 'billing-tier-3' });

    // Act
    const result = await service.routeTicket(ticket);

    // Assert
    expect(mockClassifier.classifyIntent).toHaveBeenCalledWith(ticket.content);
    expect(mockDb.tickets.update).toHaveBeenCalledWith({
      where: { id: 'tick_123' },
      data: { queue: 'billing-tier-3', routedAt: expect.any(Date) },
    });
    expect(result.queue).toBe('billing-tier-3');
  });

  describe('Edge Case Matrix', () => {
    it('throws ProblemError 422 if ticket content is empty or only whitespace', async () => {
      const emptyTicket = { id: 'tick_empty', content: '   ' };
      await expect(service.routeTicket(emptyTicket)).rejects.toThrow(ProblemError);
    });

    it('falls back to default triage queue when classifier confidence is below threshold (< 0.70)', async () => {
      const ambiguousTicket = { id: 'tick_ambig', content: 'Hello I need some help' };
      mockClassifier.classifyIntent.mockResolvedValue({
        category: 'GENERAL',
        urgency: 'LOW',
        confidence: 0.45,
      });

      await service.routeTicket(ambiguousTicket);

      expect(mockDb.tickets.update).toHaveBeenCalledWith({
        where: { id: 'tick_ambig' },
        data: { queue: 'general-triage', routedAt: expect.any(Date) },
      });
    });

    it('handles classifier service timeouts gracefully with exponential retry', async () => {
      const ticket = { id: 'tick_retry', content: 'Help' };
      mockClassifier.classifyIntent
        .mockRejectedValueOnce(new Error('Gateway Timeout'))
        .mockResolvedValueOnce({ category: 'TECH', urgency: 'LOW', confidence: 0.85 });

      const result = await service.routeTicket(ticket);
      expect(mockClassifier.classifyIntent).toHaveBeenCalledTimes(2);
      expect(result.queue).toBe('technical-support');
    });
  });
});
```

---

## 3. End-to-End & Accessibility Testing with Playwright

Playwright tests validate user-critical journeys and enforce WCAG 2.1 AA accessibility standards via `@axe-core/playwright`.

### Page Object Model & Axe Accessibility Assertion

```javascript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

class SupportDashboardPage {
  constructor(page) {
    this.page = page;
    this.ticketList = page.locator('[data-testid="ticket-list"]');
    this.newTicketBtn = page.locator('[data-testid="new-ticket-button"]');
    this.modal = page.locator('[role="dialog"]');
    this.subjectInput = page.locator('input[name="subject"]');
    this.submitBtn = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async createTicket(subject) {
    await this.newTicketBtn.click();
    await expect(this.modal).toBeVisible();
    await this.subjectInput.fill(subject);
    await this.submitBtn.click();
  }
}

test.describe('Support Dashboard Critical Journey', () => {
  test('creates new support ticket and verifies zero accessibility violations', async ({ page }) => {
    const dashboard = new SupportDashboardPage(page);
    await dashboard.goto();

    // 1. Accessibility Audit on Dashboard View
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);

    // 2. Perform Critical User Flow
    await dashboard.createTicket('Enterprise SSO integration failure');

    // 3. Verify Ticket Appeared in UI
    await expect(dashboard.ticketList).toContainText('Enterprise SSO integration failure');
  });
});
```

---

## 4. Coverage Thresholds & Quality Gates

Code submitted to this repository must meet the following automated coverage thresholds in CI:
- **Core Business Logic (`server/services/`)**: Minimum **85% branch coverage**.
- **Security & Authorization Middleware**: Minimum **95% statement and branch coverage**.
- **Data Validation & Schemas**: Minimum **90% coverage**.

---

## 5. TDD Quality Checklist

- [ ] Failing unit tests authored before implementation code.
- [ ] Edge cases tested: `null`, `undefined`, empty string, negative values, maximum bounds.
- [ ] Network failures, timeouts, and external service downtimes mocked and asserted.
- [ ] Playwright E2E verifies complete flow with `@axe-core/playwright` accessibility check.
- [ ] Branch coverage satisfies the 85%+ threshold.
