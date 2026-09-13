import { expect, test } from '@playwright/test';
import {
	fillTravelBasic,
	fillTravelBudget,
	fillTravelTrip,
	fillLeaveBasic,
	fillLeaveDates,
	openCleanPage,
	openCreatePage,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('差旅申请事由过短时不能进入下一步', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'travel', 'basic');

	await page.getByLabel('出差事由').fill('太短');
	await page.getByRole('button', { name: '下一步' }).click();

	await expect(page).toHaveURL(/\/create\/travel\/basic$/);
	await expect(page.getByText('请完善「出差事由」')).toBeVisible();
});

test('请假结束日期早于开始日期时不能进入预览', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');
	await fillLeaveBasic(page, uniqueReason('E2E校验请假'));
	await page.getByRole('button', { name: '下一步' }).click();

	await fillLeaveDates(page, '2026-10-03', '2026-10-01');
	await page.getByRole('button', { name: '下一步' }).click();

	await expect(page).toHaveURL(/\/create\/leave\/detail$/);
	await expect(page.getByText('请完善「请假时间」')).toBeVisible();
});

test('差旅预算超过一万元且没有说明时不能提交', async ({ page }) => {
	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'travel', 'basic');
	await fillTravelBasic(page, uniqueReason('E2E预算校验'));
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelTrip(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelBudget(page, '5000');
	await page.getByLabel('住宿费').fill('5001');
	await page.getByRole('button', { name: '下一步' }).click();
	await page.getByRole('button', { name: '提交申请' }).click();

	// action 校验失败时，SvelteKit 会保留预览页，并附加 ?/submit。
	await expect(page).toHaveURL(/\/create\/travel\/preview(?:\?\/submit)?$/);
	await expect(page.getByRole('alert')).toContainText('预算超过 10,000 元，请填写预算说明');
});
