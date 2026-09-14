<script lang="ts">
	import { onMount } from 'svelte';
	import type { EChartOption } from '$lib/components/common/EChart.svelte';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EChart from '$lib/components/common/EChart.svelte';
	import Panel from '$lib/components/common/Panel.svelte';
	import StatCard from '$lib/components/common/StatCard.svelte';
	import { APPLICATION_STATUS, enumService, type ApplicationStatusValue } from '$lib/enums';
	import { APPLICATION_TYPES, type ApplicationType } from '$lib/domain/applicationTypes';
	import { formatDate, formatYearMonth } from '$lib/format/date';
	import {
		applicationBudgetTotalOf,
		applicationLeaveRangeOf,
		applicationLeaveTypeOf,
		applicationRouteOf,
		centsToYuan,
		formatAmount
	} from '$lib/utils';
	import Table, {
		type TableCellContext,
		type TableColumn
	} from '$lib/components/common/Table.svelte';

	type Application = PageData['applications'][number];

	type StatusConfig = {
		status: ApplicationStatusValue;
		label: string;
		color: string;
		badgeClass: string;
	};

	let { data }: { data: PageData } = $props();
	let showFilters = $state(false);
	let isHydrated = $state(false);
	let statusFilter = $state<'all' | ApplicationStatusValue>('all');
	let yearFilter = $state('all');
	let monthFilter = $state('all');

	onMount(() => {
		isHydrated = true;
	});

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
	const applicationType = $derived((data.applicationType ?? 'travel') as ApplicationType);
	const listConfig = $derived(APPLICATION_TYPES[applicationType].list);
	let yearOptions = $derived.by(() => {
		const years = new Set(
			applications.map((application: Application) => String(new Date(application.createdAt).getUTCFullYear()))
		);
		return [...years].sort((a, b) => Number(b) - Number(a));
	});
	const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
	let visibleApplications = $derived(
		applications.filter((application: Application) => {
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
			(application: Application) =>
				application.status === APPLICATION_STATUS.pendingManager ||
				application.status === APPLICATION_STATUS.pendingFinance
		).length
	);
	let approved = $derived(
		applications.filter((application: Application) => application.status === APPLICATION_STATUS.approved).length
	);
	let rejected = $derived(
		applications.filter((application: Application) => application.status === APPLICATION_STATUS.rejected).length
	);
	let passRate = $derived(approved + rejected === 0 ? 0 : (approved / (approved + rejected)) * 100);
	let statusSlices = $derived(
		statusConfigs
			.map((config) => ({
				...config,
				value: applications.filter((application: Application) => application.status === config.status).length
			}))
			.filter((slice) => slice.value > 0)
	);

	// 趋势横轴按「本地墙钟月」生成：库里存的是本地墙钟字面量（见 format/date.ts 头注释），
	// 这里必须用本地分量取当前月，否则东八区每月 1 日 0~8 点会因 UTC 日期回退而错位一个月。
	const trendMonths = Array.from({ length: 12 }, (_, index) => {
		const date = new Date();
		date.setDate(1);
		date.setHours(0, 0, 0, 0);
		date.setMonth(date.getMonth() - (11 - index));
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	});

	let trendPoints = $derived(
		trendMonths.map((month) => ({
			month,
			count: applications.filter(
				(application: Application) => formatYearMonth(application.createdAt) === month
			).length
		}))
	);

	let pieOption = $derived<EChartOption>({
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

	let trendOption = $derived<EChartOption>({
		color: ['#6366f1'],
		tooltip: { trigger: 'axis', valueFormatter: (value: number) => `${value ?? 0} 单` },
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

	function resetFilters(): void {
		statusFilter = 'all';
		yearFilter = 'all';
		monthFilter = 'all';
		showFilters = false;
	}

	const columns: TableColumn<Application>[] = [
		{ key: 'id', title: '单号', dataIndex: 'id', width: '10rem' },
		{ key: 'applicantName', title: '申请人', dataIndex: 'applicantName', width: '9rem' },
		{ key: 'reason', title: listConfig.reasonTitle, width: '22%', customCell: true },
		{ key: 'route', title: listConfig.detailTitle, width: '27%', customCell: true },
		{ key: 'createdAt', title: '申请日期', width: '10rem', customCell: true },
		{ key: 'status', title: '申请状态', width: '10rem', customCell: true },
		{ key: 'amount', title: listConfig.amountTitle, width: '10rem', align: 'right', customCell: true },
		{ key: 'action', title: '操作', width: '6rem', customCell: true }
	];
</script>

<div class="min-h-full">
	<PageHeader
		title="统计报表"
		description={`${APPLICATION_TYPES[applicationType].label}数据总览与审批效率`}
	/>

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

	<div class="mb-2 flex justify-end gap-2" data-stats-hydrated={isHydrated ? 'true' : undefined}>
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
	</div>

	<Panel title="申请记录">
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
				{#if column.key === 'reason'}
					{@const reason = String(record.fields?.reason ?? '-')}
					<span class="block max-w-72 truncate" title={reason}>{reason}</span>
				{:else if column.key === 'route'}
					{@const detail =
						applicationType === 'leave'
							? applicationLeaveRangeOf(record)
							: applicationRouteOf(record)}
					<span class="block max-w-80 truncate" title={detail}>{detail}</span>
				{:else if column.key === 'createdAt'}
					<span class="text-slate-600">{formatDate(record.createdAt)}</span>
				{:else if column.key === 'status'}
					{@const config = statusMap[record.status]}
					<span class={config?.badgeClass ?? enumService.className(APPLICATION_STATUS.draft)}>
						{config?.label ?? record.status}
					</span>
				{:else if column.key === 'amount'}
					{#if applicationType === 'leave'}
						<span class="font-medium text-slate-800">{applicationLeaveTypeOf(record)}</span>
					{:else}
						<span class="font-medium tabular-nums text-slate-800">
							{formatAmount(centsToYuan(applicationBudgetTotalOf(record)))}
						</span>
					{/if}
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
<!--
			<button
				type="button"
				class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
				class:border-blue-500={showFilters}
				class:bg-blue-50={showFilters}
				class:text-blue-600={showFilters}
				aria-label="筛选申请记录"
				aria-expanded={showFilters}
				title="筛选"
				onclick={() => {
					showFilters = true;
				}}
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
-->
</div>
