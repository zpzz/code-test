import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectUser,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('普通员工没有审批权限', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await page.goto('/approvals');
	await expect(page.getByText('当前角色没有审批权限', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '通过' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: '驳回' })).toHaveCount(0);
});

test('财务不能处理待主管审批的申请', async ({ page }) => {
	const reason = uniqueReason('E2E审批权限');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, reason);

	await selectUser(page, 'finance');
	await page.goto('/approvals');
	const row = page.locator('tr').filter({ hasText: reason });
	await expect(row).toHaveCount(0);
});
