/**
 * Auth fixture — one pre-authenticated Page per role, built from the role's saved
 * storageState so each test runs isolated but skips the login flow.
 *
 * Add a role by copying a block. The combined export lives in test.fixture.ts:
 *   export { test, expect } from './auth.fixture';
 */
import { test as base, type Page } from '@playwright/test';
import path from 'node:path';

export type AuthFixtures = {
  adminPage: Page;
  sellerPage: Page;
  customerPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('.auth/admin.json'),
      baseURL: process.env.ADMIN_URL ?? 'https://staging-admin.example.com',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  sellerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('.auth/seller.json'),
      baseURL: process.env.SELLER_URL ?? 'https://staging-seller.example.com',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  customerPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('.auth/customer.json'),
      baseURL: process.env.CUSTOMER_URL ?? 'https://staging.example.com',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
