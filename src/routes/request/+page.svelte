<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Table, { type TableColumn } from '$lib/components/common/Table.svelte';
	import { currentUserState } from '$lib/stores/user';
	import { APPLICATION_STATUS, enumService, type ApplicationStatusValue } from '$lib/enums';

	let { data }: { data: PageData } = $props();
	let allApplications = $derived(data.applications);

	type Application = PageData['applications'][number];
	type BudgetFields = {
		legs?: Array<{ from?: string; to?: string }>;
		budget?: Record<string, number | undefined>;
	};

	type FilterValue = 'all' | string;
	type StatusFilter = 'all' | 'pending' | ApplicationStatusValue;

	const applicationStatusOptions = enumService.options('applicationStatus');
	const statusOption = (value: ApplicationStatusValue) =>
		applicationStatusOptions.find((option) => option.value === value) ?? {
			label: value,
			value
		};

	const statusFilters: Array<{ value: StatusFilter; label: string }> = [
		{ value: 'all', label: '全部' },
		statusOption(APPLICATION_STATUS.draft),
		{ value: 'pending', label: '审批中' },
		statusOption(APPLICATION_STATUS.approved),
		statusOption(APPLICATION_STATUS.rejected),
		statusOption(APPLICATION_STATUS.cancelled)
	];

	let showFilters = $state(false);
	let statusFilter = $state<StatusFilter>('all');
	let yearFilter = $state<FilterValue>('all');
	let monthFilter = $state<FilterValue>('all');
	let keyword = $state('');

	let myApplications = $derived(
		$currentUserState?.id
			? allApplications.filter((app) => app.applicantId === $currentUserState.id)
			: []
	);

	let yearOptions = $derived.by(() => {
		const years = new Set(
			myApplications.map((application) =>
				String(new Date(application.createdAt).getUTCFullYear())
			)
		);
		return [...years].sort((a, b) => Number(b) - Number(a));
	});

	const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

	let statusOptions = $derived(
		statusFilters.map((option) => ({
			...option,
			count:
				option.value === 'all'
					? myApplications.length
					: option.value === 'pending'
						? myApplications.filter(
								(application) =>
									application.status === APPLICATION_STATUS.pendingManager ||
									application.status === APPLICATION_STATUS.pendingFinance
							).length
						: myApplications.filter((application) => application.status === option.value).length
		}))
	);

	let visibleApplications = $derived.by(() => {
		const search = keyword.trim().toLowerCase();

		return myApplications.filter((application) => {
			if (
				statusFilter === 'pending' &&
				application.status !== APPLICATION_STATUS.pendingManager &&
				application.status !== APPLICATION_STATUS.pendingFinance
			) {
				return false;
			}
			if (
				statusFilter !== 'all' &&
				statusFilter !== 'pending' &&
				application.status !== statusFilter
			) {
				return false;
			}

			const createdAt = new Date(application.createdAt);
			if (yearFilter !== 'all' && String(createdAt.getUTCFullYear()) !== yearFilter) return false;
			if (monthFilter !== 'all' && String(createdAt.getUTCMonth() + 1) !== monthFilter) return false;

			if (search === '') return true;

			const fields = fieldsOf(application);
			const destinations = (fields.legs ?? [])
				.flatMap((leg) => [leg.from, leg.to])
				.filter(Boolean)
				.join(' ');
			const searchableText = `${fields.reason ?? ''} ${destinations}`.toLowerCase();
			return searchableText.includes(search);
		});
	});

	function clearFilters(): void {
		yearFilter = 'all';
		monthFilter = 'all';
		keyword = '';
	}

	function fieldsOf(application: Application): BudgetFields {
		return application.fields as BudgetFields;
	}

	function routeOf(application: Application): string {
		const cities: string[] = [];

		for (const leg of fieldsOf(application).legs ?? []) {
			const from = leg.from?.trim();
			const to = leg.to?.trim();

			if (from && cities[cities.length - 1] !== from) cities.push(from);
			if (to && cities[cities.length - 1] !== to) cities.push(to);
		}

		return cities.length > 0 ? cities.join(' → ') : '-';
	}

	function budgetOf(application: Application): string {
		const budget = fieldsOf(application).budget ?? {};
		const total = Object.values(budget).reduce<number>(
			(sum, value) => sum + (Number(value) || 0),
			0
		);
		return `¥${total.toLocaleString('zh-CN')}`;
	}

	const columns: TableColumn<Application>[] = [
		{ key: 'id', title: '申请编号', dataIndex: 'id', width: '18%' },
		{
			key: 'destination',
			title: '目的地',
			render: (_, application) => routeOf(application)
		},
		{
			key: 'budget',
			title: '预算合计',
			render: (_, application) => budgetOf(application)
		},
		{
			key: 'status',
			title: '状态',
			dataIndex: 'status',
			render: (_, application) =>
				enumService.has('applicationStatus', application.status)
					? enumService.label('applicationStatus', application.status)
					: application.status,
			cellClassName: (_, application) =>
				enumService.has('applicationStatus', application.status)
					? enumService.className(application.status)
					: enumService.className(APPLICATION_STATUS.draft)
		},
		{
			key: 'action',
			title: '操作',
			align: 'right',
			render: () => '查看详情',
			href: (application) => `/requests/${application.id}?from=requests`
		}
	];
</script>

<div class="min-h-full">
	<PageHeader
		title="我的申请"
		description={`${$currentUserState?.name ?? '当前用户'} 发起的全部申请`}
	/>

	<div class="mb-3 flex items-center gap-3">
		<div
			class="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1"
			role="group"
			aria-label="按状态筛选"
		>
			{#each statusOptions as option (option.value)}
				{@const selected = statusFilter === option.value}
				<button
					type="button"
					aria-pressed={selected}
					class="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors {selected
						? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200'
						: 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}"
					onclick={() => (statusFilter = option.value)}
				>
					<span>{option.label}</span>
					<span class="text-slate-400">{option.count}</span>
				</button>
			{/each}
		</div>

		<button
			type="button"
			class="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			class:border-blue-500={showFilters}
			class:bg-blue-50={showFilters}
			class:text-blue-600={showFilters}
			aria-label="显示或隐藏筛选条件"
			aria-expanded={showFilters}
			title="筛选"
			onclick={() => (showFilters = !showFilters)}
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
			</svg>
		</button>
	</div>

	{#if showFilters}
		<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
			<select
				bind:value={yearFilter}
				class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				aria-label="按年份筛选"
			>
				<option value="all">全部年份</option>
				{#each yearOptions as year (year)}
					<option value={year}>{year} 年</option>
				{/each}
			</select>

			<select
				bind:value={monthFilter}
				class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				aria-label="按月份筛选"
			>
				<option value="all">全部月份</option>
				{#each monthOptions as month (month)}
					<option value={month}>{month} 月</option>
				{/each}
			</select>

			<div class="relative">
				<svg
					class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-4-4" />
				</svg>
				<input
					bind:value={keyword}
					class="h-9 w-60 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="搜索事由或目的地"
					aria-label="搜索事由或目的地"
				/>
			</div>

			{#if yearFilter !== 'all' || monthFilter !== 'all' || keyword}
				<button
					type="button"
					class="h-9 px-2 text-sm font-medium text-blue-600 hover:text-blue-700"
					onclick={clearFilters}
				>
					清除筛选
				</button>
			{/if}
		</div>
	{/if}

	<Table
		dataSource={visibleApplications}
		{columns}
		rowKey="id"
		emptyText="当前用户暂无符合条件的申请"
		pagination={{
			pageSize: 5,
			pageSizeOptions: [5, 10, 20],
			resetKey: `${$currentUserState?.id ?? ''}-${statusFilter}-${yearFilter}-${monthFilter}-${keyword}`
		}}
	/>
</div>
