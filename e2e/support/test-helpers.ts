import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type TestUser = 'employee' | 'manager' | 'finance';

const testUsers: Record<TestUser, {
	id: string;
	name: string;
	employeeId: string;
	title: string;
	department: string;
	role: TestUser;
	managerId: string | null;
	email: string;
}> = {
	employee: {
		id: 'e61fe483-3b09-4e05-b4fe-dde3bc2a8694',
		name: '张三',
		employeeId: 'EMP10086',
		title: '软件工程师',
		department: '研发部',
		role: 'employee',
		managerId: '0841d235-b926-4a41-aecd-3c5de814bd68',
		email: 'zhangsan@company.com'
	},
	manager: {
		id: '0841d235-b926-4a41-aecd-3c5de814bd68',
		name: '李经理',
		employeeId: 'EMP10001',
		title: '研发部主管',
		department: '研发部',
		role: 'manager',
		managerId: null,
		email: 'limanager@company.com'
	},
	finance: {
		id: 'f1a2c3e4-5b6d-4f8a-9c0b-1d2e3f4a5b6c',
		name: '王会计',
		employeeId: 'EMP20001',
		title: '财务专员',
		department: '财务部',
		role: 'finance',
		managerId: '0841d235-b926-4a41-aecd-3c5de814bd68',
		email: 'wangaccountant@company.com'
	}
};

export async function openCleanPage(page: Page, path = '/request'): Promise<void> {
	await page.context().clearCookies();
	await page.goto(path);
	await page.evaluate(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
	await page.reload();
}

export async function selectUser(page: Page, user: TestUser): Promise<void> {
	const selectedUser = testUsers[user];
	const origin = new URL(page.url()).origin;
	await page.context().addCookies([
		{
			name: 'applicantId',
			value: selectedUser.id,
			url: `${origin}/`
		}
	]);
	await page.evaluate((currentUser) => {
		localStorage.setItem('currentUser', JSON.stringify(currentUser));
	}, selectedUser);
	await page.reload();
	const userSelect = page.locator('header select');
	await expect(userSelect).toHaveValue(selectedUser.id);
}

export async function openApprovalsPage(page: Page): Promise<void> {
	await page.goto('/approvals', { waitUntil: 'domcontentloaded' });
	await expect(page.getByRole('heading', { name: '待我审批' })).toBeVisible();
}

export async function selectApplicationType(
	page: Page,
	type: 'travel' | 'leave'
): Promise<void> {
	const applicationTypeSelect = page.getByRole('combobox', { name: '选择申请类型' });
	await applicationTypeSelect.waitFor({ state: 'visible' });

	if ((await applicationTypeSelect.inputValue()) !== type) {
		const origin = new URL(page.url()).origin;
		await page.context().addCookies([
			{
				name: 'currentApplicationType',
				value: type,
				url: `${origin}/`
			}
		]);
		await page.evaluate((currentType) => {
			localStorage.setItem('currentApplicationType', currentType);
		}, type);
		await page.reload();
	}

	await expect(page.getByRole('combobox', { name: '选择申请类型' })).toHaveValue(type);
}

export async function switchApplicationTypeThroughUi(
	page: Page,
	type: 'travel' | 'leave'
): Promise<void> {
	const applicationTypeSelect = page.getByRole('combobox', { name: '选择申请类型' });
	await applicationTypeSelect.waitFor({ state: 'visible' });
	await applicationTypeSelect.selectOption(type);
	await expect(applicationTypeSelect).toHaveValue(type);
}

export async function openCreatePage(
	page: Page,
	type: 'travel' | 'leave',
	step: string
): Promise<void> {
	await page.goto(`/create/${type}/${step}`);
	await page.waitForTimeout(500);
	await expect(page.getByRole('heading', { name: /发起|编辑/ })).toBeVisible();
}

export async function fillTravelBasic(page: Page, reason: string): Promise<void> {
	await expect(page.getByLabel('出差事由')).toBeVisible();
	await page.getByLabel('出差事由').fill(reason);
	await page.getByLabel('普通').check();
}

export async function fillTravelTrip(page: Page): Promise<void> {
	await expect(page.getByLabel('出发地')).toBeVisible();
	await page.getByLabel('出发地').fill('上海');
	await page.getByLabel('目的地').fill('北京');
	await page.getByLabel('出发日期').fill('2026-10-01');
	await page.getByLabel('返回日期').fill('2026-10-03');
	await page.getByLabel('交通方式').selectOption('train');
}

export async function fillTravelBudget(page: Page, amount = '100'): Promise<void> {
	await page.getByLabel('交通费').fill(amount);
	await page.getByLabel('住宿费').fill('200');
	await page.getByLabel('补贴').fill('100');
	await page.getByLabel('其他').fill('0');
}

export async function fillLeaveBasic(page: Page, reason: string): Promise<void> {
	await expect(page.getByLabel('请假事由')).toBeVisible();
	await page.getByLabel('请假事由').fill(reason);
	await page.getByLabel('请假类型').selectOption('annual');
}

export async function fillLeaveDates(
	page: Page,
	start = '2026-10-01',
	end = '2026-10-03'
): Promise<void> {
	await expect(page.getByLabel('请假时间（开始）')).toBeVisible();
	await page.getByLabel('请假时间（开始）').fill(start);
	await page.getByLabel('请假时间（结束）').fill(end);
}

export async function submitTravelApplication(page: Page, reason: string): Promise<void> {
	await openCreatePage(page, 'travel', 'basic');
	await fillTravelBasic(page, reason);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelTrip(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillTravelBudget(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await page.getByRole('button', { name: '提交申请' }).click();
	await page.waitForURL(/\/request$/);
	await selectApplicationType(page, 'travel');
}

export async function submitLeaveApplication(page: Page, reason: string): Promise<void> {
	await openCreatePage(page, 'leave', 'basic');
	await fillLeaveBasic(page, reason);
	await page.getByRole('button', { name: '下一步' }).click();
	await fillLeaveDates(page);
	await page.getByRole('button', { name: '下一步' }).click();
	await page.getByRole('button', { name: '提交申请' }).click();
	await page.waitForURL(/\/request$/);
	await selectApplicationType(page, 'leave');
}

export function uniqueReason(prefix: string): string {
	return `${prefix}-${Date.now()}`;
}
