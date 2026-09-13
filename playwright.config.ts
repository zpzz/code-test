import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	timeout: 30_000,
	workers: 1,
	fullyParallel: false,
	use: {
		baseURL: 'http://127.0.0.1:5173',
		actionTimeout: 10_000,
		navigationTimeout: 15_000,
		trace: 'on-first-retry',
		channel: 'chrome',
		launchOptions: {
			args: ['--auto-open-devtools-for-tabs']
		},
		...devices['Desktop Chrome']
	},
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1',
		url: 'http://127.0.0.1:5173',
		reuseExistingServer: true,
		timeout: 120_000
	},
	reporter: 'list'
});
