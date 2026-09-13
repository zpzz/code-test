import { describe, expect, it } from 'vitest';
import {
	getNextSubmitStatus,
	normalizeApplicationFields,
	readApplicationFields,
	validateApplicationForSubmit,
	yuanToCents
} from '$lib/utils/application-form';
import { APPLICATION_STATUS, USER_ROLE } from '$lib/enums';

const validTravelFields = {
	reason: '客户现场交付支持',
	urgency: 'urgent',
	legs: [
		{
			id: 'leg-1',
			from: ' 上海 ',
			to: '北京',
			departDate: '2026-09-20',
			returnDate: '2026-09-22',
			transport: 'train'
		}
	],
	budget: {
		transport: 500,
		hotel: 800,
		allowance: 300,
		other: 0
	},
	budgetNote: ''
};

describe('application-form utils', () => {
	it('读取合法和非法的表单 JSON', () => {
		expect(readApplicationFields(JSON.stringify({ reason: '请假' }))).toEqual({
			reason: '请假'
		});
		expect(readApplicationFields(null)).toBeNull();
		expect(readApplicationFields(new File(['x'], 'fields.json'))).toBeNull();
		expect(readApplicationFields('{invalid-json')).toBeNull();
		expect(readApplicationFields(JSON.stringify(null))).toBeNull();
	});

	it('将金额转换为分并处理非法输入', () => {
		expect(yuanToCents(12.345)).toBe(1235);
		expect(yuanToCents('10.5')).toBe(1050);
		expect(yuanToCents(-1)).toBe(0);
		expect(yuanToCents('invalid')).toBe(0);
	});

	it('标准化差旅字段、金额、交通方式和默认值', () => {
		const fields = normalizeApplicationFields({
			...validTravelFields,
			legs: [
				{
					...validTravelFields.legs[0],
					id: undefined,
					transport: 'unknown'
				}
			]
		});

		expect(fields).toMatchObject({
			reason: '客户现场交付支持',
			urgency: 'urgent',
			budget: {
				transport: 50000,
				hotel: 80000,
				allowance: 30000,
				other: 0
			},
			budgetNote: ''
		});
		expect(fields.legs[0]).toMatchObject({
			id: 'leg-1',
			from: '上海',
			transport: 'train'
		});
	});

	it('优先从 leaveRange 标准化请假日期', () => {
		const fields = normalizeApplicationFields({
			reason: '家中有事需要请假',
			leaveType: 'personal',
			leaveStart: '2026-10-01',
			leaveEnd: '2026-10-02',
			leaveRange: {
				leaveStart: '2026-09-20',
				leaveEnd: '2026-09-21'
			},
			note: '备注'
		});

		expect(fields).toMatchObject({
			leaveType: 'personal',
			leaveStart: '2026-09-20',
			leaveEnd: '2026-09-21',
			note: '备注'
		});
	});

	it('校验差旅申请的主要错误分支', () => {
		const normalized = normalizeApplicationFields(validTravelFields);

		expect(
			validateApplicationForSubmit({ ...normalized, reason: '短' }, 'travel')
		).toBe('申请事由请填写 5 至 200 个字');
		expect(
			validateApplicationForSubmit({ ...normalized, legs: [] }, 'travel')
		).toBe('请至少添加一段行程');
		expect(
			validateApplicationForSubmit(
				{
					...normalized,
					legs: [{ ...normalized.legs[0], from: '', to: '' }]
				},
				'travel'
			)
		).toBe('请完善每段行程的出发地、目的地和日期');
		expect(
			validateApplicationForSubmit(
				{
					...normalized,
					legs: [{ ...normalized.legs[0], from: '上海', to: '上海' }]
				},
				'travel'
			)
		).toBe('出发地与目的地不能相同');
		expect(
			validateApplicationForSubmit(
				{
					...normalized,
					legs: [{ ...normalized.legs[0], departDate: '2026-09-23' }]
				},
				'travel'
			)
		).toBe('返回日期不能早于出发日期');
		expect(
			validateApplicationForSubmit(
				{ ...normalized, budget: { transport: 0, hotel: 0, allowance: 0, other: 0 } },
				'travel'
			)
		).toBe('预算合计需大于 0');
		expect(
			validateApplicationForSubmit(
				{
					...normalized,
					budget: { transport: 1_000_001, hotel: 0, allowance: 0, other: 0 },
					budgetNote: ''
				},
				'travel'
			)
		).toBe('预算超过 10,000 元，请填写预算说明');
	});

	it('校验合法差旅和请假申请', () => {
		expect(validateApplicationForSubmit(normalizeApplicationFields(validTravelFields), 'travel')).toBeNull();
		expect(
			validateApplicationForSubmit(
				normalizeApplicationFields({
					reason: '家中有事需要请假',
					leaveType: 'personal',
					leaveRange: {
						leaveStart: '2026-09-20',
						leaveEnd: '2026-09-21'
					}
				}),
				'leave'
			)
		).toBeNull();
	});

	it('校验请假申请的类型和日期', () => {
		const base = normalizeApplicationFields({
			reason: '家中有事需要请假',
			leaveType: 'personal',
			leaveRange: {
				leaveStart: '2026-09-20',
				leaveEnd: '2026-09-21'
			}
		});

		expect(validateApplicationForSubmit({ ...base, leaveType: '' }, 'leave')).toBe('请选择请假类型');
		expect(validateApplicationForSubmit({ ...base, leaveStart: '' }, 'leave')).toBe(
			'请填写完整的请假时间'
		);
		expect(validateApplicationForSubmit({ ...base, leaveEnd: '2026-09-19' }, 'leave')).toBe(
			'请假结束日期不能早于开始日期'
		);
	});

	it('根据角色计算提交后的审批状态', () => {
		expect(getNextSubmitStatus(USER_ROLE.manager)).toBe(APPLICATION_STATUS.pendingFinance);
		expect(getNextSubmitStatus(USER_ROLE.employee)).toBe(APPLICATION_STATUS.pendingManager);
		expect(getNextSubmitStatus(USER_ROLE.finance)).toBe(APPLICATION_STATUS.pendingManager);
	});
});
