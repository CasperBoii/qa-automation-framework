/**
 * Marketplace E2E — Playwright config template.
 *
 * Project model (per role): setup-{role} → {role} (authenticated) → {role}-guest (unauthenticated).
 * The project has three roles — admin, seller, customer — each gets the same three-project shape.
 *
 * Cross-platform path matching: ALWAYS use `[\\/]` in testMatch/testIgnore, never a bare `/`.
 * Playwright matches testMatch against the absolute file path, which uses `\` on Windows
 * and `/` on Linux CI. `[\\/]` matches both; a bare `/` silently fails on the other OS.
 */
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',

    // Cloudflare Access bypass — REQUIRED: staging redirects every request to the CF
    // login page unless these service-token headers are present.
    extraHTTPHeaders: {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID ?? '',
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET ?? '',
    },
  },

  projects: [
    // --- Auth setup — runs once per role, saves storageState ---
    {
      name: 'setup-admin',
      testMatch: /admin\.setup\.ts/,
      use: { baseURL: process.env.ADMIN_URL ?? 'https://staging-admin.example.com' },
    },
    {
      name: 'setup-seller',
      testMatch: /seller\.setup\.ts/,
      use: { baseURL: process.env.SELLER_URL ?? 'https://staging-seller.example.com' },
    },
    {
      name: 'setup-customer',
      testMatch: /customer\.setup\.ts/,
      use: { baseURL: process.env.CUSTOMER_URL ?? 'https://staging.example.com' },
    },

    // --- Authenticated test projects (load storageState from setup) ---
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_URL ?? 'https://staging-admin.example.com',
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup-admin'],
      testMatch: /e2e[\\/](?:.*[\\/])?admin[\\/].*\.spec\.ts/,
      testIgnore: /[\\/]login[\\/].*\.spec\.ts/, // login-flow specs run as guest
    },
    {
      name: 'seller',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SELLER_URL ?? 'https://staging-seller.example.com',
        storageState: '.auth/seller.json',
      },
      dependencies: ['setup-seller'],
      testMatch: /e2e[\\/](?:.*[\\/])?seller[\\/].*\.spec\.ts/,
      testIgnore: /[\\/]login[\\/].*\.spec\.ts/,
    },
    {
      name: 'customer',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CUSTOMER_URL ?? 'https://staging.example.com',
        storageState: '.auth/customer.json',
      },
      dependencies: ['setup-customer'],
      testMatch: /e2e[\\/](?:.*[\\/])?customer[\\/].*\.spec\.ts/,
      testIgnore: /[\\/]login[\\/].*\.spec\.ts/,
    },

    // --- Guest projects — unauthenticated, for the login flow itself ---
    // MUST NOT have storageState or dependencies, otherwise the test starts logged in
    // and navigating to /login redirects to / before the login form is exercised.
    {
      name: 'admin-guest',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_URL ?? 'https://staging-admin.example.com',
      },
      testMatch: /e2e[\\/](?:.*[\\/])?admin[\\/]login[\\/].*\.spec\.ts/,
    },
    {
      name: 'seller-guest',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SELLER_URL ?? 'https://staging-seller.example.com',
      },
      testMatch: /e2e[\\/](?:.*[\\/])?seller[\\/]login[\\/].*\.spec\.ts/,
    },
    {
      name: 'customer-guest',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CUSTOMER_URL ?? 'https://staging.example.com',
      },
      testMatch: /e2e[\\/](?:.*[\\/])?customer[\\/]login[\\/].*\.spec\.ts/,
    },
  ],
});
