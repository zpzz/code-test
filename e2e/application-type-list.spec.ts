import { expect, test } from '@playwright/test';

test('切换到请假申请后，我的申请页面展示请假字段', async ({ page }) => {
	// 清理跨测试运行残留的申请类型，避免上一次的 travel/leave 影响本次测试。
	await page.context().clearCookies();
	await page.addInitScript(() => {
		localStorage.clear();
	});
	await page.goto('/request');
	await page.waitForLoadState('networkidle');

	const applicationTypeSelect = page.getByRole('combobox', { name: '选择申请类型' });
	await expect(applicationTypeSelect).toBeVisible();

	const currentApplicationType = await applicationTypeSelect.inputValue();
	expect(['travel', 'leave']).toContain(currentApplicationType);

	if (currentApplicationType === 'travel') {
		await applicationTypeSelect.selectOption('leave');
	}

	await expect(page).toHaveURL(/\/request$/);
	await expect(applicationTypeSelect).toHaveValue('leave');

	await expect(page.getByRole('heading', { name: '我的申请' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '请假事由' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '请假时间' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '请假类型' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: '出差事由' })).toHaveCount(0);
	await expect(page.getByRole('columnheader', { name: '目的地' })).toHaveCount(0);
	await expect(page.getByRole('columnheader', { name: '预算合计' })).toHaveCount(0);
});
