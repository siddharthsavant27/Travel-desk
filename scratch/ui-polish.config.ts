import { defineConfig } from '@playwright/test';
import config from '../playwright.config';

export default defineConfig({
  ...config,
  testDir: '../e2e',
  use: { ...config.use, baseURL: 'http://localhost:3002', channel: 'msedge' },
  webServer: undefined,
});
