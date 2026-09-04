import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Pagination from '$lib/components/common/Pagination.svelte';

describe('Pagination', () => {
	afterEach(() => {
		cleanup();
	});

	it('does not render controls when there are no items', () => {
		render(Pagination, {
			props: {
				page: 1,
				pageSize: 5,
				total: 0,
				onPageChange: vi.fn(),
				onPageSizeChange: vi.fn()
			}
		});

		expect(screen.queryByRole('navigation', { name: '分页' })).toBeNull();
	});

	it('changes page through the next-page control', async () => {
		const onPageChange = vi.fn();

		render(Pagination, {
			props: {
				page: 1,
				pageSize: 5,
				total: 12,
				onPageChange,
				onPageSizeChange: vi.fn()
			}
		});

		const navigation = screen.getByRole('navigation', { name: '分页' });
		expect(within(navigation).getByRole('button', { name: '上一页' }).hasAttribute('disabled')).toBe(
			true
		);
		expect(within(navigation).getByText('共 12 条')).toBeTruthy();

		await fireEvent.click(within(navigation).getByRole('button', { name: '下一页' }));

		expect(onPageChange).toHaveBeenCalledWith(2);
	});

	it('passes the selected page size back to the parent', async () => {
		const onPageSizeChange = vi.fn();

		render(Pagination, {
			props: {
				page: 1,
				pageSize: 5,
				total: 12,
				pageSizeOptions: [5, 10, 20],
				onPageChange: vi.fn(),
				onPageSizeChange
			}
		});

		await fireEvent.change(screen.getByLabelText('每页条数'), { target: { value: '20' } });

		expect(onPageSizeChange).toHaveBeenCalledWith(20);
	});
});
