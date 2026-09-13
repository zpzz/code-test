import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectUser,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('经理可以在详情页通过待主管审批申请', async ({ page }) => {
	const reason = uniqueReason('E2E详情审批');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, reason);

	await selectUser(page, 'manager');
	await page.goto('/approvals');
	const row = page.locator('tr').filter({ hasText: reason });
	await expect(row).toBeVisible();
	await row.getByRole('link', { name: '查看详情' }).click();

	await expect(page).toHaveURL(/\/requests\/[^?]+\?from=approvals$/);
	await expect(page.getByRole('button', { name: '通过' })).toBeVisible();
	await expect(page.getByRole('button', { name: '驳回' })).toBeVisible();
	await page.getByRole('button', { name: '通过' }).click();
	await expect(page).toHaveURL('/approvals');
});
