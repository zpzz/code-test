<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EChart from '$lib/components/common/EChart.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';
	import { APPLICATION_STATUS, enumService, type ApplicationStatusValue } from '$lib/enums';
	import Table, {
		type TableCellContext,
		type TableColumn
	} from '$lib/components/common/Table.svelte';

	type Application = PageData['applications'][number];
	type TravelFields = {
		legs?: Array<{ from?: string; to?: string }>;
		budget?: Record<string, number | undefined>;
	};

	type StatusConfig = {
		status: ApplicationStatusValue;
		label: string;
		color: string;
		badgeClass: string;
	};

	let { data }: { data: PageData } = $props();
	let showFilters = $state(false);
	let statusFilter = $state<'all' | ApplicationStatusValue>('all');
	let yearFilter = $state('all');
	let monthFilter = $state('all');

	const statusConfigs: StatusConfig[] = enumService.options('applicationStatus').map((option) => ({
		status: option.value,
		label: option.label,
		color: enumService.color(option.value),
		badgeClass: enumService.className(option.value)
	}));

	const statusMap = Object.fromEntries(
		statusConfigs.map((config) => [config.status, config])
	) as Record<string, StatusConfig>;

	let applications = $derived(data.applications);
	let yearOptions = $derived.by(() => {
		const years = new Set(
			applications.map((application) => String(new Date(application.createdAt).getUTCFullYear()))
		);
		return [...years].sort((a, b) => Number(b) - Number(a));
	});
	const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
	let visibleApplications = $derived(
		applications.filter((application) => {
			const createdAt = new Date(application.createdAt);

			if (statusFilter !== 'all' && application.status !== statusFilter) return false;
			if (yearFilter !== 'all' && String(createdAt.getUTCFullYear()) !== yearFilter) return false;
			if (monthFilter !== 'all' && String(createdAt.getUTCMonth() + 1) !== monthFilter) return false;

			return true;
		})
	);
	let total = $derived(applications.length);
	let pending = $derived(
		applications.filter(
			(application) =>
				application.status === APPLICATION_STATUS.pendingManager ||
				application.status === APPLICATION_STATUS.pendingFinance
		).length
	);
	let approved = $derived(
		applications.filter((application) => application.status === APPLICATION_STATUS.approved).length
	);
	let rejected = $derived(
		applications.filter((application) => application.status === APPLICATION_STATUS.rejected).length
	);
	let passRate = $derived(approved + rejected === 0 ? 0 : (approved / (approved + rejected)) * 100);
	let statusSlices = $derived(
		statusConfigs
			.map((config) => ({
				...config,
				value: applications.filter((application) => application.status === config.status).length
			}))
			.filter((slice) => slice.value > 0)
	);

	const trendMonths = Array.from({ length: 12 }, (_, index) => {
		const date = new Date();
		date.setUTCDate(1);
		date.setUTCHours(0, 0, 0, 0);
		date.setUTCMonth(date.getUTCMonth() - (11 - index));
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
	});

	let trendPoints = $derived(
		trendMonths.map((month) => ({
			month,
			count: applications.filter((application) => formatMonth(application.createdAt) === month).length
		}))
	);

	let pieOption = $derived<EChartsOption>({
		color: statusSlices.map((slice) => slice.color),
		tooltip: {
			trigger: 'item',
			formatter: '{b}: {c} 单 ({d}%)'
		},
		legend: {
			bottom: 0,
			left: 'center',
			itemWidth: 16,
			itemHeight: 10,
			textStyle: { color: '#64748b', fontSize: 12 }
		},
		series: [
			{
				name: '申请状态',
				type: 'pie',
				radius: ['44%', '67%'],
				center: ['50%', '45%'],
				avoidLabelOverlap: true,
				itemStyle: { borderColor: '#fff', borderWidth: 2 },
				label: { formatter: '{b}\n{d}%', color: '#475569', fontSize: 12 },
				labelLine: { length: 13, length2: 12 },
				data: statusSlices.map((slice) => ({ name: slice.label, value: slice.value }))
			}
		]
	});

	let trendOption = $derived<EChartsOption>({
		color: ['#6366f1'],
		tooltip: { trigger: 'axis', valueFormatter: (value) => `${value ?? 0} 单` },
		grid: { top: 28, right: 20, bottom: 28, left: 16, containLabel: true },
		xAxis: {
			type: 'category',
			boundaryGap: false,
			data: trendPoints.map((point) => point.month),
			axisLabel: { color: '#94a3b8', fontSize: 11 },
			axisLine: { lineStyle: { color: '#e2e8f0' } },
			axisTick: { show: false }
		},
		yAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { color: '#64748b' },
			splitLine: { lineStyle: { color: '#eef2f7' } }
		},
		series: [
			{
				name: '申请量',
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2, color: '#6366f1' },
				areaStyle: { color: 'rgba(99, 102, 241, 0.16)' },
				data: trendPoints.map((point) => point.count)
			}
		]
	});

	function fieldsOf(application: Application): TravelFields {
		return application.fields as TravelFields;
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

	function amountOf(application: Application): string {
		const cents = Object.values(fieldsOf(application).budget ?? {}).reduce(
			(sum, value) => sum + (Number(value) || 0),
			0
		);
		return `¥${(cents / 100).toLocaleString('zh-CN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`;
	}

	function formatMonth(value: string | Date): string {
		const date = new Date(value);
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
	}

	function formatDate(value: string | Date): string {
		const date = new Date(value);
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
			date.getUTCDate()
		).padStart(2, '0')}`;
	}

	function resetFilters(): void {
		statusFilter = 'all';
		yearFilter = 'all';
		monthFilter = 'all';
		showFilters = false;
	}

	const columns: TableColumn<Application>[] = [
		{ key: 'id', title: '单号', dataIndex: 'id', width: '10rem' },
		{ key: 'applicantName', title: '申请人', dataIndex: 'applicantName', width: '9rem' },
		{ key: 'route', title: '行程明细', width: '27%', customCell: true },
		{ key: 'createdAt', title: '申请日期', width: '10rem', customCell: true },
		{ key: 'status', title: '申请状态', width: '10rem', customCell: true },
		{ key: 'amount', title: '申请金额', width: '10rem', align: 'right', customCell: true },
		{ key: 'action', title: '操作', width: '6rem', customCell: true }
	];
</script>

<div class="min-h-full">
	<PageHeader title="统计报表" description="差旅申请数据总览与审批效率" />

	<div class="mb-4 grid gap-3 md:grid-cols-3">
		<StatCard label="申请总数" value={total} />
		<StatCard label="待处理" value={pending} />
		<StatCard label="通过率" value={`${passRate.toFixed(1)}%`} />
	</div>

	<div class="mb-4 grid gap-4 xl:grid-cols-2">
		<Panel title="申请状态分布">
			<EChart option={pieOption} height="320px" />
		</Panel>

		<Panel title="近 12 个月申请量趋势">
			<EChart option={trendOption} height="320px" />
		</Panel>
	</div>

	<Panel title="申请记录" actions={recordActions}>
		{#if showFilters}
			<div class="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 pt-3 pb-5">
				<label class="text-sm text-slate-600" for="stats-status">申请状态</label>
				<select
					id="stats-status"
					bind:value={statusFilter}
					class="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					<option value="all">全部状态</option>
					{#each statusConfigs as config (config.status)}
						<option value={config.status}>{config.label}</option>
					{/each}
				</select>

				<label class="text-sm text-slate-600" for="stats-year">年份</label>
				<select
					id="stats-year"
					bind:value={yearFilter}
					class="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					<option value="all">全部年份</option>
					{#each yearOptions as year (year)}
						<option value={year}>{year} 年</option>
					{/each}
				</select>

				<label class="text-sm text-slate-600" for="stats-month">月份</label>
				<select
					id="stats-month"
					bind:value={monthFilter}
					class="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					<option value="all">全部月份</option>
					{#each monthOptions as month (month)}
						<option value={month}>{month} 月</option>
					{/each}
				</select>
			</div>
		{/if}

		<Table
			dataSource={visibleApplications}
			{columns}
			rowKey="id"
			framed={false}
			emptyText="暂无匹配的申请记录"
			pagination={{
				pageSize: 5,
				pageSizeOptions: [5, 10, 20],
				resetKey: `${statusFilter}-${yearFilter}-${monthFilter}`
			}}
		>
			{#snippet cell(context: TableCellContext<Application>)}
				{@const { column, record } = context}
				{#if column.key === 'route'}
					<span class="block max-w-80 truncate" title={routeOf(record)}>{routeOf(record)}</span>
				{:else if column.key === 'createdAt'}
					<span class="text-slate-600">{formatDate(record.createdAt)}</span>
				{:else if column.key === 'status'}
					{@const config = statusMap[record.status]}
					<span class={config?.badgeClass ?? enumService.className(APPLICATION_STATUS.draft)}>
						{config?.label ?? record.status}
					</span>
				{:else if column.key === 'amount'}
					<span class="font-medium tabular-nums text-slate-800">{amountOf(record)}</span>
				{:else if column.key === 'action'}
					<a
						href={`/requests/${record.id}?from=stats`}
						class="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
					>
						查看
					</a>
				{/if}
			{/snippet}
		</Table>
	</Panel>

	{#snippet recordActions()}
			<button
				type="button"
				class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
				class:border-blue-500={showFilters}
				class:bg-blue-50={showFilters}
				class:text-blue-600={showFilters}
				aria-label="筛选申请记录"
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
			<button
				type="button"
				class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
				aria-label="清除筛选"
				title="清除筛选"
				onclick={resetFilters}
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>
	{/snippet}
</div>
