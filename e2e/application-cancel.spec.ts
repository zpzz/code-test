import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectUser,
	submitLeaveApplication,
	uniqueReason
} from './support/test-helpers';

test('申请人在待审批状态可以撤销申请', async ({ page }) => {
	const reason = uniqueReason('E2E撤销申请');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitLeaveApplication(page, reason);

	const row = page.locator('tr').filter({ hasText: reason });
	await row.getByRole('link', { name: '查看详情' }).click();
	await expect(page.getByRole('button', { name: '撤销' })).toBeVisible();

	await page.getByRole('button', { name: '撤销' }).click();
	await expect(page).toHaveURL(/\/requests\/[^?]+\?from=requests$/);
	await expect(page.locator('main')).toContainText('已撤销');
	await expect(page.getByRole('button', { name: '撤销' })).toHaveCount(0);
});
