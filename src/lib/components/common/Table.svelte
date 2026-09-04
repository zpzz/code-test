<script lang="ts" generics="T extends object">
	import type { Snippet } from 'svelte';
	import Pagination from './Pagination.svelte';

	export type TableCellValue = string | number | boolean | null | undefined;

	export interface TableColumn<T extends object> {
		key: string;
		title: string;
		dataIndex?: keyof T;
		width?: string;
		align?: 'left' | 'center' | 'right';
		render?: (value: TableCellValue, record: T, index: number) => TableCellValue;
		cellClassName?: (value: TableCellValue, record: T, index: number) => string;
		href?: (record: T, index: number) => string;
		customHeader?: boolean;
		customCell?: boolean;
	}

	type RowKey<T extends object> = keyof T | ((record: T, index: number) => string | number);

	export interface TablePagination {
		/** 初始每页条数，默认为 10 */
		pageSize?: number;
		/** 每页条数下拉选项，默认为 5 / 10 / 20 */
		pageSizeOptions?: readonly number[];
		/** 该值变化时重置到第一页，适合传入筛选条件组合 */
		resetKey?: unknown;
	}

	export interface TableHeaderContext<T extends object> {
		column: TableColumn<T>;
	}

	export interface TableCellContext<T extends object> {
		column: TableColumn<T>;
		value: TableCellValue;
		record: T;
		index: number;
	}

	interface Props<T extends object> {
		dataSource?: readonly T[];
		columns: readonly TableColumn<T>[];
		rowKey?: RowKey<T>;
		emptyText?: string;
		pagination?: TablePagination | false;
		framed?: boolean;
		header?: Snippet<[TableHeaderContext<T>]>;
		cell?: Snippet<[TableCellContext<T>]>;
	}

	let {
		dataSource = [],
		columns,
		rowKey = undefined,
		emptyText = '暂无数据',
		pagination = false,
		framed = true,
		header,
		cell
	}: Props<T> = $props();

	let page = $state(1);
	let pageSize = $state(10);
	let configuredPageSize = $state<number | undefined>(undefined);

	let total = $derived(dataSource.length);
	let pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));
	let pageSizeOptions = $derived.by(() => {
		const options = pagination ? (pagination.pageSizeOptions ?? [5, 10, 20]) : [5, 10, 20];
		return [...new Set([...options, pageSize])].sort((a, b) => a - b);
	});
	let pageDataSource = $derived(
		pagination ? dataSource.slice((page - 1) * pageSize, page * pageSize) : dataSource
	);

	$effect(() => {
		const nextPageSize = pagination ? pagination.pageSize ?? 10 : undefined;
		if (nextPageSize === configuredPageSize) return;

		configuredPageSize = nextPageSize;
		if (nextPageSize) {
			pageSize = nextPageSize;
			page = 1;
		}
	});

	$effect(() => {
		void (pagination ? pagination.resetKey : undefined);
		page = 1;
	});

	$effect(() => {
		if (page > pageCount) page = pageCount;
	});

	function getValue(record: T, column: TableColumn<T>): TableCellValue {
		if (column.dataIndex === undefined) return undefined;
		return record[column.dataIndex] as TableCellValue;
	}

	function getCellValue(record: T, column: TableColumn<T>, index: number): TableCellValue {
		const value = getValue(record, column);
		return column.render ? column.render(value, record, index) : value;
	}

	function getCellClassName(record: T, column: TableColumn<T>, index: number): string {
		return column.cellClassName?.(getValue(record, column), record, index) ?? '';
	}

	function getRowKey(record: T, index: number): string | number {
		if (typeof rowKey === 'function') return rowKey(record, index);
		if (rowKey !== undefined) return String(record[rowKey]);
		return index;
	}

	function changePage(nextPage: number): void {
		page = nextPage;
	}

	function changePageSize(nextPageSize: number): void {
		pageSize = nextPageSize;
		page = 1;
	}
</script>

<div class="table-shell" class:table-shell--flat={!framed}>
	<div class="table-scroll">
		<table class="data-table">
			<thead>
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							style:width={column.width}
							class="data-table__cell data-table__cell--head"
							class:data-table__cell--center={column.align === 'center'}
							class:data-table__cell--right={column.align === 'right'}
						>
							{#if column.customHeader && header}
								{@render header({ column })}
							{:else}
								{column.title}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if pageDataSource.length === 0}
					<tr>
						<td class="data-table__empty" colspan={Math.max(columns.length, 1)}>
							{emptyText}
						</td>
					</tr>
				{:else}
					{#each pageDataSource as record, index (getRowKey(record, (page - 1) * pageSize + index))}
						{@const recordIndex = pagination ? (page - 1) * pageSize + index : index}
						<tr class:data-table__row--striped={index % 2 === 1}>
							{#each columns as column (column.key)}
								{@const cellValue = getCellValue(record, column, recordIndex)}
								{@const href = column.href?.(record, recordIndex)}
								<td
									class="data-table__cell"
									class:data-table__cell--center={column.align === 'center'}
									class:data-table__cell--right={column.align === 'right'}
								>
									{#if column.customCell && cell}
										{@render cell({ column, value: getValue(record, column), record, index: recordIndex })}
									{:else}
										<span class={getCellClassName(record, column, recordIndex)}>
											{#if href}
												<a class="data-table__link" {href}>{cellValue}</a>
											{:else}
												{cellValue}
											{/if}
										</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

{#if pagination}
	<div class:table-pagination--in-panel={!framed}>
		<Pagination
			{page}
			{pageSize}
			{total}
			{pageSizeOptions}
			onPageChange={changePage}
			onPageSizeChange={changePageSize}
		/>
	</div>
{/if}

<style>
	.table-shell {
		overflow: hidden;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		background: #ffffff;
		box-shadow:
			0 1px 2px rgb(15 23 42 / 0.04),
			0 6px 18px rgb(15 23 42 / 0.04);
	}

	.table-scroll {
		overflow-x: auto;
	}

	.table-shell--flat {
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}

	.table-pagination--in-panel {
		padding: 0 1rem 1rem;
	}

	.data-table {
		width: 100%;
		min-width: 36rem;
		border-collapse: collapse;
		color: #0f172a;
		font-size: 0.875rem;
	}

	.data-table__cell {
		border-bottom: 1px solid #f1f5f9;
		padding: 0.9rem 1rem;
		text-align: left;
		vertical-align: middle;
		white-space: nowrap;
	}

	.data-table__cell--head {
		border-bottom-color: #e2e8f0;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	tbody tr {
		transition: background-color 150ms ease;
	}

	tbody tr:hover {
		background: #f8fbff;
	}

	.data-table__row--striped {
		background: #fcfdff;
	}

	tbody tr:last-child .data-table__cell {
		border-bottom: 0;
	}

	.data-table__cell--center {
		text-align: center;
	}

	.data-table__cell--right {
		text-align: right;
	}

	.data-table__empty {
		padding: 3rem 1rem;
		color: #94a3b8;
		text-align: center;
	}

	.data-table__link {
		color: #2563eb;
		font-weight: 600;
		text-decoration: none;
	}

	.data-table__link:hover {
		color: #1d4ed8;
		text-decoration: underline;
	}
</style>
