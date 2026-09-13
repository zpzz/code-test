import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DynamicField from '$lib/components/form/DynamicField.svelte';

afterEach(() => {
	cleanup();
});

describe('DynamicField', () => {
	it('渲染文本域并回传输入内容', async () => {
		const onChange = vi.fn();
		render(DynamicField, {
			props: {
				field: { kind: 'textarea', key: 'reason', label: '申请事由', required: true },
				value: '',
				onChange
			}
		});

		const textarea = screen.getByLabelText(/申请事由/);
		await fireEvent.input(textarea, { target: { value: '客户拜访' } });

		expect(onChange).toHaveBeenCalledWith('客户拜访');
		expect(screen.getByText('*')).toBeTruthy();
	});

	it('渲染选择框和单选框并回传选项值', async () => {
		const onSelectChange = vi.fn();
		const selectField = {
			kind: 'select' as const,
			key: 'leaveType',
			label: '请假类型',
			options: [
				{ label: '年假', value: 'annual' },
				{ label: '病假', value: 'sick' }
			]
		};
		const { unmount } = render(DynamicField, {
			props: { field: selectField, value: '', onChange: onSelectChange }
		});

		await fireEvent.change(screen.getByLabelText('请假类型'), { target: { value: 'sick' } });
		expect(onSelectChange).toHaveBeenCalledWith('sick');

		unmount();
		const onRadioChange = vi.fn();
		render(DynamicField, {
			props: {
				field: {
					kind: 'radio',
					key: 'urgency',
					label: '紧急程度',
					options: [
						{ label: '普通', value: 'normal' },
						{ label: '紧急', value: 'urgent' }
					]
				},
				value: 'normal',
				onChange: onRadioChange
			}
		});

		await fireEvent.click(screen.getByLabelText('紧急'));
		expect(onRadioChange).toHaveBeenCalledWith('urgent');
	});

	it('渲染日期范围并保留开始和结束日期', async () => {
		const onChange = vi.fn();
		render(DynamicField, {
			props: {
				field: {
					kind: 'dateRange',
					key: 'leaveRange',
					label: '请假时间',
					fromKey: 'leaveStart',
					toKey: 'leaveEnd'
				},
				value: { leaveStart: '', leaveEnd: '' },
				onChange
			}
		});

		await fireEvent.input(screen.getByLabelText('请假时间（开始）'), {
			target: { value: '2026-09-20' }
		});
		await fireEvent.input(screen.getByLabelText('请假时间（结束）'), {
			target: { value: '2026-09-21' }
		});

		expect(onChange).toHaveBeenNthCalledWith(1, {
			leaveStart: '2026-09-20',
			leaveEnd: ''
		});
		expect(onChange).toHaveBeenNthCalledWith(2, {
			leaveStart: '',
			leaveEnd: '2026-09-21'
		});
	});

	it('repeatable 字段默认渲染一行，并支持添加和删除', async () => {
		const onChange = vi.fn();
		const field = {
			kind: 'repeatable' as const,
			key: 'legs',
			label: '行程明细',
			itemKey: 'id',
			min: 1,
			max: 3,
			addLabel: '添加行程段',
			itemFields: [
				{ kind: 'text' as const, key: 'from', label: '出发地' },
				{ kind: 'text' as const, key: 'to', label: '目的地' }
			]
		};

		const { rerender } = render(DynamicField, {
			props: { field, value: [], onChange }
		});

		expect(screen.getByLabelText('出发地')).toBeTruthy();
		expect(screen.getByLabelText('目的地')).toBeTruthy();
		expect(screen.getByRole('button', { name: '删除' }).hasAttribute('disabled')).toBe(true);

		await fireEvent.click(screen.getByRole('button', { name: '添加行程段' }));
		expect(onChange).toHaveBeenCalledWith([
			{ from: '', to: '' },
			{ from: '', to: '' }
		]);

		await rerender({ field, value: [{ from: '上海', to: '北京' }, { from: '', to: '' }], onChange });
		expect(
			screen.getAllByRole('button', { name: '删除' }).every((button) => !button.hasAttribute('disabled'))
		).toBe(true);
		await fireEvent.click(screen.getAllByRole('button', { name: '删除' })[0]);
		expect(onChange).toHaveBeenLastCalledWith([{ from: '', to: '' }]);
	});
});
