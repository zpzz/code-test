import { describe, expect, it } from 'vitest';
import {
	applicationBudgetTotalOf,
	applicationFieldsOf,
	applicationLeaveRangeOf,
	applicationLeaveTypeOf,
	applicationRouteOf,
	applicationSearchTextOf
} from '$lib/utils/application-display';

describe('application-display utils', () => {
	it('读取申请字段并拼接连续行程', () => {
		const application = {
			fields: {
				reason: '客户拜访',
				legs: [
					{ from: '上海', to: '北京' },
					{ from: '北京', to: '杭州' }
				]
			}
		};

		expect(applicationFieldsOf(application).reason).toBe('客户拜访');
		expect(applicationRouteOf(application)).toBe('上海 → 北京 → 杭州');
	});

	it('没有行程或空字段时返回占位符', () => {
		expect(applicationRouteOf({ fields: {} })).toBe('-');
		expect(applicationRouteOf({ fields: { legs: [{ from: ' ', to: '' }] } })).toBe('-');
		expect(applicationLeaveRangeOf({ fields: {} })).toBe('-');
		expect(applicationLeaveTypeOf({ fields: {} })).toBe('-');
	});

	it('计算预算总额', () => {
		expect(
			applicationBudgetTotalOf({
				fields: {
					budget: {
						transport: 1000,
						hotel: 2500,
						allowance: undefined,
						other: '300'
					}
				}
			})
		).toBe(3800);
		expect(applicationBudgetTotalOf({ fields: {} })).toBe(0);
	});

	it('格式化请假日期和请假类型', () => {
		expect(
			applicationLeaveRangeOf({
				fields: {
					leaveRange: {
						leaveStart: '2026-09-20',
						leaveEnd: '2026-09-21'
					}
				}
			})
		).toBe('2026-09-20 至 2026-09-21');
		expect(
			applicationLeaveRangeOf({
				fields: { leaveStart: '2026-09-20' }
			})
		).toBe('2026-09-20');
		expect(applicationLeaveTypeOf({ fields: { leaveType: 'sick' } })).toBe('病假');
		expect(applicationLeaveTypeOf({ fields: { leaveType: 'unknown' } })).toBe('unknown');
	});

	it('生成可用于搜索的文本', () => {
		const text = applicationSearchTextOf({
			fields: {
				reason: '客户拜访',
				legs: [{ from: '上海', to: '北京' }],
				leaveRange: {
					leaveStart: '2026-09-20',
					leaveEnd: '2026-09-21'
				},
				leaveType: 'sick'
			}
		});

		expect(text).toContain('客户拜访');
		expect(text).toContain('上海');
		expect(text).toContain('北京');
		expect(text).toContain('2026-09-20 至 2026-09-21');
		expect(text).toContain('sick');
	});
});
