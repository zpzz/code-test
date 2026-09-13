import { describe, expect, it } from 'vitest';
import { isStepSlug, stepHref, stepIndex, stepsOf } from '$lib/domain/wizard';

describe('wizard domain helpers', () => {
	it('返回差旅和请假申请配置的步骤', () => {
		expect(stepsOf('travel').map((step) => step.slug)).toEqual([
			'basic',
			'trips',
			'budget',
			'preview'
		]);
		expect(stepsOf('leave').map((step) => step.slug)).toEqual(['basic', 'detail', 'preview']);
	});

	it('判断步骤是否存在并返回索引', () => {
		expect(isStepSlug('travel', 'trips')).toBe(true);
		expect(isStepSlug('leave', 'trips')).toBe(false);
		expect(stepIndex('travel', 'budget')).toBe(2);
		expect(stepIndex('leave', 'unknown')).toBe(0);
	});

	it('生成普通和编辑状态下的步骤地址', () => {
		expect(stepHref('travel', 'trips')).toBe('/create/travel/trips');
		expect(stepHref('leave', 'detail', 'LV 0001')).toBe(
			'/create/leave/detail?edit=LV%200001'
		);
		expect(stepHref('leave', 'preview', '')).toBe('/create/leave/preview');
	});
});
