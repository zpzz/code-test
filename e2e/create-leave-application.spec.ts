import { expect, test } from '@playwright/test';
import {
	fillLeaveBasic,
	fillLeaveDates,
	openCleanPage,
	openCreatePage,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('员工可以完成请假申请并保留请假日期', async ({ page }) => {
	const reason = uniqueReason('E2E请假申请');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');

	await fillLeaveBasic(page, reason);
	await page.getByRole('button', { name: '下一步' }).click();
	await expect(page).toHaveURL(/\/create\/leave\/detail$/);

	await fillLeaveDates(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await expect(page).toHaveURL(/\/create\/leave\/preview$/);

	await expect(page.getByText('2026-10-01 至 2026-10-03')).toBeVisible();
	await expect(page.getByText('年假')).toBeVisible();

	await page.getByRole('button', { name: '提交申请' }).click();
	await expect(page).toHaveURL(/\/request$/);
	await expect(page.getByText(reason)).toBeVisible();
});
