import { describe, expect, it } from 'vitest';
import type { FieldDef } from '$lib/domain/applicationTypes';
import {
	createInitialFields,
	displayValue,
	flattenPreviewFields,
	mergeInitialFields,
	toFormFields,
	validateField,
	valueForPreview
} from '$lib/utils/application-wizard';

const travelFields: FieldDef[] = [
	{
		kind: 'textarea',
		key: 'reason',
		label: '出差事由',
		required: true,
		minLength: 5,
		maxLength: 200
	},
	{
		kind: 'radio',
		key: 'urgency',
		label: '紧急程度',
		required: true,
		options: [
			{ label: '普通', value: 'normal' },
			{ label: '紧急', value: 'urgent' }
		]
	},
	{
		kind: 'repeatable',
		key: 'legs',
		label: '行程明细',
		itemKey: 'id',
		min: 1,
		max: 2,
		itemFields: [
			{ kind: 'text', key: 'from', label: '出发地', required: true },
			{ kind: 'text', key: 'to', label: '目的地', required: true },
			{ kind: 'date', key: 'departDate', label: '出发日期', required: true },
			{ kind: 'select', key: 'transport', label: '交通方式', options: [{ label: '火车', value: 'train' }] }
		]
	},
	{
		kind: 'group',
		key: 'budget',
		label: '费用预算',
		fields: [
			{ kind: 'number', key: 'transport', label: '交通费', required: true, money: true },
			{ kind: 'number', key: 'other', label: '其他', required: true, money: true }
		]
	},
	{
		kind: 'dateRange',
		key: 'leaveRange',
		label: '请假时间',
		required: true,
		fromKey: 'leaveStart',
		toKey: 'leaveEnd'
	}
];

describe('application-wizard utils', () => {
	it('根据字段定义创建初始表单值', () => {
		expect(createInitialFields(travelFields)).toEqual({
			reason: '',
			urgency: 'normal',
			legs: [
				{
					from: '',
					to: '',
					departDate: '',
					transport: ''
				}
			],
			budget: {
				transport: 0,
				other: 0
			},
			leaveRange: {
				leaveStart: '',
				leaveEnd: ''
			}
		});
	});

	it('将数据库字段转换为表单字段并把金额从分转换为元', () => {
		const result = toFormFields(travelFields, {
			reason: '客户现场支持',
			urgency: 'urgent',
			legs: [{ id: 'leg-1', from: '上海', to: '北京', departDate: '2026-10-01', transport: 'train' }],
			budget: { transport: 12550, other: 300 },
			leaveStart: '2026-10-01',
			leaveEnd: '2026-10-03'
		});

		expect(result).toMatchObject({
			reason: '客户现场支持',
			urgency: 'urgent',
			budget: { transport: 125.5, other: 3 },
			leaveRange: { leaveStart: '2026-10-01', leaveEnd: '2026-10-03' }
		});
		expect(result.legs).toEqual([
			{ from: '上海', to: '北京', departDate: '2026-10-01', transport: 'train' }
		]);
	});

	it('合并草稿时补齐缺失字段和最少重复行', () => {
		const result = mergeInitialFields(travelFields, {
			reason: '已保存的申请',
			budget: { transport: 100 }
		});

		expect(result.reason).toBe('已保存的申请');
		expect(result.urgency).toBe('normal');
		expect(result.legs).toEqual([
			{ from: '', to: '', departDate: '', transport: '' }
		]);
		expect(result.budget).toEqual({ transport: 100, other: 0 });
		expect(result.leaveRange).toEqual({ leaveStart: '', leaveEnd: '' });
	});

	it('读取预览值并兼容平铺的日期字段', () => {
		const dateRange = travelFields.find((field) => field.kind === 'dateRange');
		if (!dateRange || dateRange.kind !== 'dateRange') throw new Error('缺少日期范围字段');

		expect(valueForPreview(dateRange, {
			leaveStart: '2026-10-01',
			leaveEnd: '2026-10-03'
		})).toEqual({
			leaveStart: '2026-10-01',
			leaveEnd: '2026-10-03'
		});
	});

	it('展开分组字段但保留重复字段作为一个展示项', () => {
		const fields = flattenPreviewFields(travelFields);

		expect(fields.map((field) => field.key)).toEqual([
			'reason',
			'urgency',
			'legs',
			'transport',
			'other',
			'leaveRange'
		]);
	});

	it('格式化枚举、金额、日期范围和重复字段', () => {
		const urgency = travelFields.find((field) => field.key === 'urgency');
		const budget = travelFields
			.flatMap((field) => (field.kind === 'group' ? field.fields : [field]))
			.find((field) => field.key === 'transport');
		const legs = travelFields.find((field) => field.key === 'legs');
		const leaveRange = travelFields.find((field) => field.key === 'leaveRange');

		expect(urgency && displayValue(urgency, 'urgent')).toBe('紧急');
		expect(budget && displayValue(budget, 12550)).toBe('¥125.50');
		expect(
			leaveRange &&
				displayValue(leaveRange, {
					leaveStart: '2026-10-01',
					leaveEnd: '2026-10-03'
				})
		).toBe('2026-10-01 至 2026-10-03');
		expect(
			legs &&
				displayValue(legs, [
					{ from: '上海', to: '北京', departDate: '2026-10-01', transport: 'train' }
				])
		).toContain('1. 出发地: 上海，目的地: 北京');
	});

	it('校验必填、长度、分组、重复字段和日期范围', () => {
		const reason = travelFields[0];
		const legs = travelFields.find((field) => field.key === 'legs');
		const budget = travelFields.find((field) => field.key === 'budget');
		const leaveRange = travelFields.find((field) => field.key === 'leaveRange');

		expect(validateField(reason, '')).toBe(false);
		expect(validateField(reason, '短')).toBe(false);
		expect(validateField(reason, '客户现场支持')).toBe(true);

		expect(
			legs &&
				validateField(legs, [
					{ from: '上海', to: '北京', departDate: '2026-10-01', transport: 'train' }
				])
		).toBe(true);
		expect(legs && validateField(legs, [])).toBe(false);
		expect(
			legs &&
				validateField(legs, [
					{ from: '', to: '北京', departDate: '2026-10-01', transport: 'train' }
				])
		).toBe(false);
		expect(
			legs &&
				validateField(legs, [
					{ from: '上海', to: '北京', departDate: '2026-10-01', transport: 'train' },
					{ from: '广州', to: '深圳', departDate: '2026-10-02', transport: 'train' },
					{ from: '杭州', to: '南京', departDate: '2026-10-03', transport: 'train' }
				])
		).toBe(false);

		expect(budget && validateField(budget, { transport: 100, other: 0 })).toBe(true);
		expect(budget && validateField(budget, { transport: 100 })).toBe(false);
		expect(leaveRange && validateField(leaveRange, { leaveStart: '2026-10-03', leaveEnd: '2026-10-01' })).toBe(false);
		expect(leaveRange && validateField(leaveRange, { leaveStart: '2026-10-01', leaveEnd: '2026-10-03' })).toBe(true);
	});
});
