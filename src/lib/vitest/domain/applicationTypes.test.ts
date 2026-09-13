import { describe, expect, it } from 'vitest';
import {
	APPLICATION_TYPES,
	getApplicationType,
	isApplicationType
} from '$lib/domain/applicationTypes';

describe('application type definitions', () => {
	it('包含差旅和请假两种申请类型', () => {
		expect(APPLICATION_TYPES.travel).toMatchObject({
			type: 'travel',
			label: '差旅申请',
			idPrefix: 'TR'
		});
		expect(APPLICATION_TYPES.leave).toMatchObject({
			type: 'leave',
			label: '请假申请',
			idPrefix: 'LV'
		});
	});

	it('差旅配置包含行程和预算，请假配置包含请假时间', () => {
		const travelSteps = APPLICATION_TYPES.travel.steps;
		const leaveSteps = APPLICATION_TYPES.leave.steps;

		expect(travelSteps.map((step) => step.slug)).toEqual(['basic', 'trips', 'budget', 'preview']);
		expect(leaveSteps.map((step) => step.slug)).toEqual(['basic', 'detail', 'preview']);
		expect(travelSteps.find((step) => step.slug === 'trips')?.fields[0]).toMatchObject({
			kind: 'repeatable',
			key: 'legs',
			min: 1,
			max: 10
		});
		expect(leaveSteps.find((step) => step.slug === 'detail')?.fields[0]).toMatchObject({
			kind: 'dateRange',
			key: 'leaveRange'
		});
	});

	it('列表展示配置按申请类型区分', () => {
		expect(APPLICATION_TYPES.travel.list).toMatchObject({
			reasonTitle: '出差事由',
			detailTitle: '目的地',
			amountTitle: '预算合计'
		});
		expect(APPLICATION_TYPES.leave.list).toMatchObject({
			reasonTitle: '请假事由',
			detailTitle: '请假时间',
			amountTitle: '请假类型'
		});
	});

	it('校验申请类型和默认类型', () => {
		expect(isApplicationType('travel')).toBe(true);
		expect(isApplicationType('leave')).toBe(true);
		expect(isApplicationType('expense')).toBe(false);
		expect(getApplicationType('expense')).toBe(APPLICATION_TYPES.travel);
	});

	it('差旅预算校验和请假类型没有差旅预算校验', () => {
		expect(
			APPLICATION_TYPES.travel.typeRefine?.({
				budget: { transport: 0, hotel: 0, allowance: 0, other: 0 }
			})
		).toBe('预算合计需大于 0');
		expect(
			APPLICATION_TYPES.travel.typeRefine?.({
				budget: { transport: 10001, hotel: 0, allowance: 0, other: 0 },
				budgetNote: ''
			})
		).toBe('预算超过 10,000 元，请填写预算说明');
		expect(APPLICATION_TYPES.leave.typeRefine).toBeUndefined();
	});
});
