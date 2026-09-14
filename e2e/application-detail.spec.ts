import { expect, test } from '@playwright/test';
import {
	fillLeaveBasic,
	openCleanPage,
	openCreatePage,
	selectUser,
	uniqueReason
} from './support/test-helpers';

test('详情页根据申请类型展示动态字段并提供返回入口', async ({ page }) => {
	const reason = uniqueReason('E2E详情请假');

	await openCleanPage(page);
	await selectUser(page, 'employee');
	await openCreatePage(page, 'leave', 'basic');
	await fillLeaveBasic(page, reason);
	await page.getByRole('button', { name: '存为草稿' }).click();
	await expect(page).toHaveURL(/\/request$/);

	const row = page.locator('tr').filter({ hasText: reason });
	await expect(row).toBeVisible();
	await row.getByRole('link', { name: '查看详情' }).click();

	await expect(page).toHaveURL(/\/requests\/[^?]+\?from=requests$/);
	await expect(page.getByRole('heading', { name: '请假申请详情' })).toBeVisible();
	const detailContent = page.locator('main');
	await expect(detailContent).toContainText('请假事由');
	await expect(detailContent).toContainText('请假类型');
	await expect(detailContent).toContainText(reason);
	await expect(detailContent).toContainText('年假');
	await expect(detailContent).not.toContainText('出差事由');
	await expect(page.getByRole('link', { name: '返回我的申请' })).toBeVisible();
	await expect(page.getByRole('link', { name: '重新编辑' })).toBeVisible();
});
