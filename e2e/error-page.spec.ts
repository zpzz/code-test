import { expect, test } from '@playwright/test';

test('访问不存在的申请详情返回 404', async ({ page }) => {
	await page.goto('/requests/not-exist');
	await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('非法申请类型返回 404', async ({ page }) => {
	await page.goto('/create/unknown/basic');
	await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('非法申请步骤会回到该类型第一步', async ({ page }) => {
	await page.goto('/create/leave/unknown-step');
	await expect(page).toHaveURL(/\/create\/leave\/basic$/);
});
