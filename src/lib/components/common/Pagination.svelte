<script lang="ts">
	/** 分页器默认可选的每页条数。 */
	const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

	/** 页码窗口最多展示 5 个页码。 */
	const MAX_VISIBLE_PAGE_COUNT = 5;

	/** 当前页前后各展示几个页码。 */
	const PAGE_WINDOW_SPAN = 2;

	/** 分页器至少保留一页，避免 total 为 0 时产生无效页码。 */
	const MIN_PAGE_COUNT = 1;

	interface Props {
		page: number;
		pageSize: number;
		total: number;
		pageSizeOptions?: readonly number[];
		onPageChange: (page: number) => void;
		onPageSizeChange: (pageSize: number) => void;
	}

	let {
		page,
		pageSize,
		total,
		pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
		onPageChange,
		onPageSizeChange
	}: Props = $props();

	let pageCount = $derived(Math.max(MIN_PAGE_COUNT, Math.ceil(total / pageSize)));
	let pages = $derived.by(() => {
		let from = Math.max(1, page - PAGE_WINDOW_SPAN);
		let to = Math.min(pageCount, page + PAGE_WINDOW_SPAN);

		if (to - from < MAX_VISIBLE_PAGE_COUNT - 1) {
			if (from === 1) to = Math.min(pageCount, MAX_VISIBLE_PAGE_COUNT);
			else from = Math.max(1, to - (MAX_VISIBLE_PAGE_COUNT - 1));
		}

		return Array.from({ length: to - from + 1 }, (_, index) => from + index);
	});

	function go(nextPage: number): void {
		onPageChange(Math.min(pageCount, Math.max(1, nextPage)));
	}

	function changePageSize(event: Event): void {
		const nextPageSize = Number((event.currentTarget as HTMLSelectElement).value);
		if (Number.isFinite(nextPageSize) && nextPageSize > 0) onPageSizeChange(nextPageSize);
	}
</script>

{#if total > 0}
	<nav class="mt-4 flex flex-wrap items-center gap-3" aria-label="分页">
		<label class="inline-flex items-center gap-1.5 text-sm text-slate-600">
			<span>每页</span>
			<select
				class="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
				value={pageSize}
				aria-label="每页条数"
				onchange={changePageSize}
			>
				{#each pageSizeOptions as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
			<span>条</span>
		</label>

		<span class="text-sm text-slate-500">共 {total} 条</span>

		<div class="ml-auto inline-flex items-center gap-1" aria-label="页码">
			<button
				type="button"
				class="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={page <= 1}
				onclick={() => go(page - 1)}
			>
				上一页
			</button>

			{#each pages as item (item)}
				<button
					type="button"
					class="inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors {item ===
					page
						? 'border-blue-600 bg-blue-600 text-white'
						: 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600'}"
					aria-current={item === page ? 'page' : undefined}
					onclick={() => go(item)}
				>
					{item}
				</button>
			{/each}

			<button
				type="button"
				class="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={page >= pageCount}
				onclick={() => go(page + 1)}
			>
				下一页
			</button>
		</div>
	</nav>
{/if}
