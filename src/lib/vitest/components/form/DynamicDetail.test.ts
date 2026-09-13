import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DynamicDetail from '$lib/components/form/DynamicDetail.svelte';

afterEach(() => {
	cleanup();
});

describe('DynamicDetail', () => {
	it('展示文本、枚举和金额字段', () => {
		const { container } = render(DynamicDetail, {
			props: {
				field: {
					kind: 'group',
					key: 'basic',
					label: '基本信息',
					fields: [
						{ kind: 'text', key: 'reason', label: '申请事由' },
						{
							kind: 'select',
							key: 'leaveType',
							label: '请假类型',
							options: [{ label: '病假', value: 'sick' }]
						},
						{ kind: 'number', key: 'amount', label: '金额', money: true }
					]
				},
				value: {
					reason: '家中有事',
					leaveType: 'sick',
					amount: 12345
				}
			}
		});

		expect(screen.getByText('家中有事')).toBeTruthy();
		expect(screen.getByText('病假')).toBeTruthy();
		expect(screen.getByText('¥123.45')).toBeTruthy();
		expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
	});

	it('展示日期范围和缺失值占位符', () => {
		render(DynamicDetail, {
			props: {
				field: {
					kind: 'dateRange',
					key: 'leaveRange',
					label: '请假时间',
					fromKey: 'leaveStart',
					toKey: 'leaveEnd'
				},
				value: { leaveStart: '2026-09-20', leaveEnd: '2026-09-21' }
			}
		});

		expect(screen.getByText('请假时间')).toBeTruthy();
		expect(screen.getByText('2026-09-20 至 2026-09-21')).toBeTruthy();

		cleanup();
		render(DynamicDetail, {
			props: {
				field: { kind: 'text', key: 'note', label: '备注' },
				value: ''
			}
		});
		expect(screen.getByText('-')).toBeTruthy();
	});

	it('展示可重复的行程字段和交通方式', () => {
		render(DynamicDetail, {
			props: {
				field: {
					kind: 'repeatable',
					key: 'legs',
					label: '行程明细',
					itemKey: 'id',
					itemFields: [
						{ kind: 'text', key: 'from', label: '出发地' },
						{ kind: 'text', key: 'to', label: '目的地' },
						{ kind: 'select', key: 'transport', label: '交通方式', options: [] }
					]
				},
				value: [
					{ id: 'leg-1', from: '上海', to: '北京', transport: 'train' }
				]
			}
		});

		expect(screen.getByText('第 1 段')).toBeTruthy();
		expect(screen.getByText('上海')).toBeTruthy();
		expect(screen.getByText('北京')).toBeTruthy();
		expect(screen.getByText('高铁/火车')).toBeTruthy();
	});

	it('没有可重复数据时显示暂无数据', () => {
		render(DynamicDetail, {
			props: {
				field: {
					kind: 'repeatable',
					key: 'legs',
					label: '行程明细',
					itemKey: 'id',
					itemFields: []
				},
				value: []
			}
		});

		expect(screen.getByText('暂无数据')).toBeTruthy();
	});
});
