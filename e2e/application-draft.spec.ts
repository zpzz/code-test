import { expect, test } from '@playwright/test';
import {
	fillLeaveBasic,
	openCleanPage,
	openCreatePage,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('草稿可以查看并重新编辑', async ({ page }) => {
	const reason = uniqueReason('E2E草稿申请');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');
	await fillLeaveBasic(page, reason);
	await page.getByRole('button', { name: '存为草稿' }).click();
	await expect(page).toHaveURL(/\/request$/);

	const row = page.locator('tr').filter({ hasText: reason });
	await expect(row).toContainText('草稿');
	await row.getByRole('link', { name: '查看详情' }).click();

	await expect(page.getByRole('link', { name: '重新编辑' })).toBeVisible();
	await page.getByRole('link', { name: '重新编辑' }).click();
	await expect(page).toHaveURL(/\/create\/leave\/basic\?edit=/);
	await expect(page.getByLabel('请假事由')).toHaveValue(reason);
});

test('非申请人不能重新编辑草稿', async ({ page }) => {
	const reason = uniqueReason('E2E草稿权限');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');
	await fillLeaveBasic(page, reason);
	await page.getByRole('button', { name: '存为草稿' }).click();
	await expect(page).toHaveURL(/\/request$/);

	const row = page.locator('tr').filter({ hasText: reason });
	await row.getByRole('link', { name: '查看详情' }).click();
	const detailHref = page.url();

	await selectUser(page, 'manager');
	await page.goto(detailHref);
	await expect(page.getByRole('link', { name: '重新编辑' })).toHaveCount(0);
});
