import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectApplicationType,
	selectUser,
	submitLeaveApplication,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('我的申请可以按关键词筛选并清除筛选', async ({ page }) => {
	const reason = uniqueReason('E2E列表搜索');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, reason);
	await page.goto('/request');

	await page.getByRole('button', { name: '显示或隐藏筛选条件' }).click();
	const search = page.getByPlaceholder('搜索事由或目的地');
	await search.fill(reason);

	const matchingRow = page.locator('tr').filter({ hasText: reason });
	await expect(matchingRow).toBeVisible();
	await expect(page.locator('tbody tr')).toHaveCount(1);

	await page.getByRole('button', { name: '清除筛选' }).click();
	await expect(search).toHaveValue('');
});

test('切换申请类型后列表数据和字段隔离', async ({ page }) => {
	const travelReason = uniqueReason('E2E差旅隔离');
	const leaveReason = uniqueReason('E2E请假隔离');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, travelReason);
	await selectApplicationType(page, 'leave');
	await submitLeaveApplication(page, leaveReason);

	await expect(page.getByRole('columnheader', { name: '请假事由' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '出差事由' })).toHaveCount(0);
	await expect(page.getByText(leaveReason)).toBeVisible();
	await expect(page.getByText(travelReason)).toHaveCount(0);
});
