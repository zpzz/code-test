import { expect, test } from '@playwright/test';
import {
	openCleanPage,
	selectApplicationType,
	selectUser,
	submitLeaveApplication,
	submitTravelApplication,
	uniqueReason
} from './support/test-helpers';

test('统计报表按申请类型隔离并动态显示字段', async ({ page }) => {
	const travelReason = uniqueReason('E2E报表差旅');
	const leaveReason = uniqueReason('E2E报表请假');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await submitTravelApplication(page, travelReason);
	await selectApplicationType(page, 'leave');
	await submitLeaveApplication(page, leaveReason);

	await page.goto('/stats');
	await expect(page.getByText('请假申请数据总览与审批效率')).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '请假时间' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '预算合计' })).toHaveCount(0);
	await expect(page.getByText(leaveReason)).toBeVisible();
	await expect(page.getByText(travelReason)).toHaveCount(0);
});

test('统计报表可以按年份筛选', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await selectApplicationType(page, 'travel');
	await page.goto('/stats');
	await expect(page.locator('[data-stats-hydrated="true"]')).toBeVisible();
	await page.getByRole('button', { name: '筛选申请记录' }).click();

	const yearSelect = page.locator('#stats-year');
	await expect(yearSelect).toBeVisible();
	await yearSelect.selectOption({ index: 0 });
	await expect(page.getByText('申请记录')).toBeVisible();
});
