/**
 * Auth setup template — runs once per role (Playwright "setup" project), logs in via UI,
 * and saves storageState so authenticated specs skip the login flow.
 *
 * Wire it up in playwright.config.ts:  setup-{role} project (testMatch /{role}\.setup\.ts/)
 * → {role} project with dependencies: ['setup-{role}'].
 *
 * Guard env vars at the top — never use a non-null assertion (`!`) on process.env.
 */
import { test as setup } from '@playwright/test';
import path from 'node:path';
import { LoginPage } from '../pages/admin/login.page';

const adminAuthFile = path.resolve('.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL / ADMIN_PASSWORD missing from .env');
  }

  const login = new LoginPage(page);
  await login.goto();
  await login.submit(email, password);

  // Deterministic success signal — redirect away from /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  await page.context().storageState({ path: adminAuthFile });
});
