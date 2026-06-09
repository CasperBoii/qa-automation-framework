/**
 * Scenario: S_001 — [Scenario Name from sheet col D]
 * Jira:    https://your-domain.atlassian.net/browse/RK-XXXX
 * Sheet:   https://docs.google.com/spreadsheets/d/[id]/edit#gid=[sid]&range=A[row]
 * Covers AC: 1, 2
 *
 * Author:  Pornpavit
 * Created: YYYY-MM-DD
 */
import { test, expect } from '../../../fixtures/test.fixture';
import { OrderListPage } from '../../../pages/admin/order-list.page';

test.describe('Admin — View Refund Order Status', { tag: ['@regression', '@RK-XXXX'] }, () => {
  let orderListPage: OrderListPage;

  test.beforeEach(async ({ adminPage }) => {
    orderListPage = new OrderListPage(adminPage);
    await orderListPage.goto();
  });

  // Test title = BDD (Given/When/Then), mirroring the Jira AC format so traceability is 1:1.
  // Translate sheet col G + col K into Given/When/Then when generating.
  test(
    'TC_001 (AC-1): Given an order in refund state, When filtering by refund status, Then the order is displayed',
    { tag: ['@positive'] },
    async () => {
      // Arrange — seed data assumed; document the precondition (sheet col H) clearly.
      test.info().annotations.push({ type: 'TC', description: 'TC_001 covers AC-1 happy path' });

      // Act
      await orderListPage.filterByStatus('คืนเงิน/คืนสินค้า');

      // Assert — web-first, auto-retrying
      await expect(orderListPage.rows).toHaveCount(1);
      await expect(orderListPage.firstRow.statusBadge).toHaveText('คืนเงิน/คืนสินค้า');
    },
  );

  // Pure-assertion case (no action) → drop the "When" clause.
  test(
    'TC_002 (AC-1): Given no orders in refund state, Then no rows are shown',
    { tag: ['@negative'] },
    async () => {
      // ... 1 test = 1 behavior — never combine multiple ACs in one test.
    },
  );
});

/*
 * Tag convention — minimal, additive. The FOLDER path already conveys role + feature,
 * so do NOT repeat them as tags (@admin, @refund are redundant).
 *   Scope:    @smoke @regression @sanity
 *   Type:     @positive @negative @boundary @security
 *   Severity: @critical @major @minor
 *   Linkage:  @RK-1234 (Jira)   @no-source (Live-URL-Only, no spec)
 *   State:    @flaky @wip @skip
 */
