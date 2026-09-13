import { expect, test } from '@playwright/test';
import {
	fillTravelBasic,
	fillTravelBudget,
	fillTravelTrip,
	openCleanPage,
	openCreatePage,
	selectApplicationType,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('差旅申请可以从经理审批流转到财务审批并最终通过', async ({ page }) => {
	const reason = uniqueReason('E2E审批流程');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'travel', 'basic');
	await fillTravelBasic(page, reason);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelTrip(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelBudget(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await page.getByRole('button', { name: '提交申请' }).click();
	await expect(page).toHaveURL(/\/request$/);
	await selectApplicationType(page, 'travel');

	await selectUser(page, 'manager');
	await page.goto('/approvals');
	const managerRow = page.locator('tr').filter({ hasText: reason });
	await expect(managerRow).toBeVisible();
	const detailHref = await managerRow
		.getByRole('link', { name: '查看详情' })
		.getAttribute('href');
	expect(detailHref).toBeTruthy();
	await managerRow.getByRole('button', { name: '通过' }).click();
	await expect(managerRow).toHaveCount(0);

	await selectUser(page, 'finance');
	await page.goto('/approvals');
	const financeRow = page.locator('tr').filter({ hasText: reason });
	await expect(financeRow).toBeVisible();
	await financeRow.getByRole('button', { name: '通过' }).click();
	await expect(financeRow).toHaveCount(0);

	await page.goto(detailHref!);
	await expect(page.getByRole('heading', { name: '差旅申请详情' })).toBeVisible();
	await expect(page.locator('main')).toContainText('已通过');
});
