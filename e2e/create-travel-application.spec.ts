import { expect, test } from '@playwright/test';
import {
	fillTravelBasic,
	fillTravelBudget,
	fillTravelTrip,
	openCleanPage,
	openCreatePage,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('员工可以完成差旅申请并提交', async ({ page }) => {
	const reason = uniqueReason('E2E差旅申请');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'travel', 'basic');

	await fillTravelBasic(page, reason);
	await page.getByRole('button', { name: '下一步' }).click();
	await expect(page).toHaveURL(/\/create\/travel\/trips$/);

	await expect(page.getByLabel('出发地')).toHaveCount(1);
	await fillTravelTrip(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await expect(page).toHaveURL(/\/create\/travel\/budget$/);

	await fillTravelBudget(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await expect(page).toHaveURL(/\/create\/travel\/preview$/);
	await expect(page.getByText(reason)).toBeVisible();

	await page.getByRole('button', { name: '提交申请' }).click();
	await expect(page).toHaveURL(/\/request$/);
	await expect(page.getByText(reason)).toBeVisible();
});
