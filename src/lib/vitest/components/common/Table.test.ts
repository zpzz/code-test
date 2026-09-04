import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Table, { type TableColumn } from '$lib/components/common/Table.svelte';

interface User {
	id: number;
	name: string;
	role: string;
}

const columns: TableColumn<User>[] = [
	{ key: 'name', title: '姓名', dataIndex: 'name' },
	{ key: 'role', title: '角色', dataIndex: 'role' },
	{
		key: 'action',
		title: '操作',
		align: 'right',
		render: (_, record) => `查看 ${record.name}`
	}
];

describe('Table', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders column headers and data rows', () => {
		render(Table<User>, {
			props: {
				columns,
				dataSource: [
					{ id: 1, name: '张三', role: '员工' },
					{ id: 2, name: '李经理', role: '经理' }
				],
				rowKey: 'id'
			}
		});

		const table = screen.getByRole('table');
		expect(within(table).getByRole('columnheader', { name: '姓名' })).toBeTruthy();
		expect(within(table).getByRole('columnheader', { name: '角色' })).toBeTruthy();
		expect(within(table).getAllByRole('row')).toHaveLength(3);
		expect(within(table).getByText('张三')).toBeTruthy();
		expect(within(table).getByText('查看 李经理')).toBeTruthy();
	});

	it('renders empty text when dataSource is empty', () => {
		const { container } = render(Table<User>, {
			props: {
				columns,
				dataSource: [],
				emptyText: '暂无用户'
			}
		});

		expect(screen.getByText('暂无用户')).toBeTruthy();
		expect(within(container).getAllByRole('row')).toHaveLength(2);
	});

	it('paginates rows through the built-in pagination controls', async () => {
		const users = Array.from({ length: 6 }, (_, index) => ({
			id: index + 1,
			name: `用户 ${index + 1}`,
			role: '员工'
		}));

		render(Table<User>, {
			props: {
				columns,
				dataSource: users,
				rowKey: 'id',
				pagination: { pageSize: 5, pageSizeOptions: [5, 10] }
			}
		});

		expect(screen.getByText('用户 1')).toBeTruthy();
		expect(screen.queryByText('用户 6')).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: '下一页' }));

		expect(screen.getByText('用户 6')).toBeTruthy();
		expect(screen.queryByText('用户 1')).toBeNull();
	});

	it('renders configured links and supports the flat panel mode', () => {
		const linkColumns: TableColumn<User>[] = [
			{ key: 'name', title: '姓名', dataIndex: 'name' },
			{
				key: 'action',
				title: '操作',
				render: () => '查看',
				href: (user) => `/users/${user.id}`
			}
		];
		const { container } = render(Table<User>, {
			props: {
				columns: linkColumns,
				dataSource: [{ id: 1, name: '张三', role: '员工' }],
				rowKey: 'id',
				framed: false
			}
		});

		expect(screen.getByRole('link', { name: '查看' }).getAttribute('href')).toBe('/users/1');
		expect(container.querySelector('.table-shell--flat')).toBeTruthy();
	});
});
