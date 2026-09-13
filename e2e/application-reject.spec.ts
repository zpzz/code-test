import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	openApprovalsPage,
	selectUser,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('经理填写驳回理由后可以驳回申请', async ({ page }) => {
	const reason = uniqueReason('E2E驳回申请');
	const rejectReason = '行程安排需要补充说明';

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, reason);

	await selectUser(page, 'manager');
	await openApprovalsPage(page);

	const row = page.locator('tr').filter({ hasText: reason });
	await expect(row).toBeVisible();
	await row.getByRole('button', { name: '驳回' }).click();

	const dialog = page.locator('form[action="?/reject"]');
	await expect(dialog).toBeVisible();
	await dialog.getByPlaceholder('驳回理由（必填）').fill(rejectReason);
	await dialog.getByRole('button', { name: '确认驳回' }).click();
	await expect(row).toHaveCount(0);

	await selectUser(page, 'employee');
	await page.goto('/request');
	const rejectedRow = page.locator('tr').filter({ hasText: reason });
	await expect(rejectedRow).toContainText('已驳回');
	await rejectedRow.getByRole('link', { name: '查看详情' }).click();
	await expect(page.locator('main')).toContainText(rejectReason);
});

test('驳回理由为空时不能确认驳回', async ({ page }) => {
	const reason = uniqueReason('E2E空驳回理由');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, reason);
	await selectUser(page, 'manager');
	await openApprovalsPage(page);

	const row = page.locator('tr').filter({ hasText: reason });
	await row.getByRole('button', { name: '驳回' }).click();
	await expect(page.getByRole('button', { name: '确认驳回' })).toBeDisabled();
});
