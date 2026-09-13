import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectApplicationType,
	selectUser,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('待我审批支持全选和批量通过', async ({ page }) => {
	const firstReason = uniqueReason('E2E批量审批一');
	const secondReason = uniqueReason('E2E批量审批二');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, firstReason);
	await submitTravelApplication(page, secondReason);

	await selectUser(page, 'manager');
	await selectApplicationType(page, 'travel');
	await page.goto('/approvals');

	const firstRow = page.locator('tr').filter({ hasText: firstReason });
	const secondRow = page.locator('tr').filter({ hasText: secondReason });
	await expect(firstRow).toBeVisible();
	await expect(secondRow).toBeVisible();

	await page.getByRole('checkbox', { name: '全选待审批申请' }).check();
	await expect(page.getByText(/已选 \d+ 项/)).toBeVisible();
	await page.getByRole('button', { name: '批量通过' }).click();

	await expect(firstRow).toHaveCount(0);
	await expect(secondRow).toHaveCount(0);
});
