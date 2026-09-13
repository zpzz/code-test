import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	openCreatePage,
	selectUser
} from './support/test-helpers';

test('差旅动态表单包含四个步骤并支持添加行程段', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'travel', 'basic');

	await expect(page.getByRole('list', { name: '申请步骤' }).getByRole('button')).toHaveCount(4);
	await page.goto('/create/travel/trips');
	await expect(page.getByLabel('出发地')).toHaveCount(1);

	await page.getByRole('button', { name: '添加行程段' }).click();
	await expect(page.getByLabel('出发地')).toHaveCount(2);
});

test('请假动态表单包含三个步骤', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');

	await expect(page.getByRole('list', { name: '申请步骤' }).getByRole('button')).toHaveCount(3);
	await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
});
