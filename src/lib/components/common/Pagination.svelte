<script lang="ts">
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
		pageSizeOptions = [5, 10, 20],
		onPageChange,
		onPageSizeChange
	}: Props = $props();

	let pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));
	let pages = $derived.by(() => {
		const span = 2;
		let from = Math.max(1, page - span);
		let to = Math.min(pageCount, page + span);

		if (to - from < 4) {
			if (from === 1) to = Math.min(pageCount, 5);
			else from = Math.max(1, to - 4);
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
