/**
 * Page Object template.
 *
 * TypeScript strict gotcha: if a POM only exposes locators (no this.page.goto() or other
 * page-level call), do NOT declare `private readonly page: Page` — `noUnusedLocals` fails
 * the build. Either use this.page (e.g. for goto) or omit the field entirely.
 *
 * Rules:
 *   - Selectors live here, never in a .spec.ts.
 *   - Page Objects do NOT import other Page Objects (no cross-coupling).
 *   - goto() waits on a deterministic ready signal, never waitForTimeout.
 *   - Public methods carry explicit parameter + return types.
 */
import { expect, type Page, type Locator } from '@playwright/test';

export class OrderListPage {
  private readonly page: Page; // keep only because goto() uses it

  readonly rows: Locator;
  readonly statusFilter: Locator;
  readonly firstRow: {
    statusBadge: Locator;
    orderNumber: Locator;
  };

  constructor(page: Page) {
    this.page = page;
    // Locator priority: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > CSS.
    this.rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    this.statusFilter = page.getByLabel('สถานะ');
    this.firstRow = {
      statusBadge: this.rows.first().getByRole('status'),
      orderNumber: this.rows.first().getByRole('cell').nth(0),
    };
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/orders');
    // Deterministic ready signal — table rows OR an explicit empty-state, not a timeout.
    await expect(this.rows.first().or(this.page.getByText('ไม่มีข้อมูล'))).toBeVisible();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption({ label: status });
  }
}
