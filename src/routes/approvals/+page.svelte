<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RejectDialog from './components/RejectDialog.svelte';
	import Table, {
		type TableCellContext,
		type TableColumn,
		type TableHeaderContext
	} from '$lib/components/common/Table.svelte';
	import { currentUserState } from '$lib/stores/user';
	import { APPLICATION_STATUS, USER_ROLE, enumService } from '$lib/enums';

	type TravelFields = {
		reason?: string;
		legs?: Array<{ from?: string; to?: string }>;
		budget?: Record<string, number | undefined>;
	};

	type DateValue = string | Date | null | undefined;
	type Approval = PageData['applications'][number];

	let { data, form }: { data: PageData; form?: { success?: boolean; message?: string } } = $props();
	let selectedIds = $state<string[]>([]);
	let rejectTarget = $state<Approval | null>(null);

	let approvals = $derived.by(() => {
		const user = $currentUserState;
		if (!user) return [];

		if (user.role === USER_ROLE.manager) {
			return data.applications.filter(
				(application) =>
					application.status === APPLICATION_STATUS.pendingManager &&
					application.applicantId !== user.id &&
					application.applicant.managerId === user.id
			);
		}

		if (user.role === USER_ROLE.finance) {
			return data.applications.filter(
				(application) =>
					application.status === APPLICATION_STATUS.pendingFinance &&
					application.applicantId !== user.id
			);
		}

		return [];
	});

	let approvalIds = $derived(approvals.map((application) => application.id));
	let allSelected = $derived(
		approvalIds.length > 0 && approvalIds.every((applicationId) => selectedIds.includes(applicationId))
	);
	let hasApprovalPermission = $derived(
		$currentUserState?.role === USER_ROLE.manager || $currentUserState?.role === USER_ROLE.finance
	);
	let pendingLabel = $derived(
		$currentUserState?.role === USER_ROLE.finance
			? enumService.label('applicationStatus', APPLICATION_STATUS.pendingFinance)
			: enumService.label('applicationStatus', APPLICATION_STATUS.pendingManager)
	);
	let selectedPayload = $derived(JSON.stringify(selectedIds));

	$effect(() => {
		const validIds = new Set(approvalIds);
		if (selectedIds.some((id) => !validIds.has(id))) {
			selectedIds = selectedIds.filter((id) => validIds.has(id));
		}
	});

	function toggleSelection(applicationId: string): void {
		selectedIds = selectedIds.includes(applicationId)
			? selectedIds.filter((id) => id !== applicationId)
			: [...selectedIds, applicationId];
	}

	function toggleAll(): void {
		if (allSelected) {
			selectedIds = [];
			return;
		}

		selectedIds = [...approvalIds];
	}

	function fieldsOf(application: PageData['applications'][number]): TravelFields {
		return application.fields as TravelFields;
	}

	function routeOf(application: PageData['applications'][number]): string {
		const cities: string[] = [];

		for (const leg of fieldsOf(application).legs ?? []) {
			const from = leg.from?.trim();
			const to = leg.to?.trim();

			if (from && cities[cities.length - 1] !== from) cities.push(from);
			if (to && cities[cities.length - 1] !== to) cities.push(to);
		}

		return cities.length > 0 ? cities.join(' → ') : '-';
	}

	function budgetOf(application: PageData['applications'][number]): string {
		const total = Object.values(fieldsOf(application).budget ?? {}).reduce(
			(sum, value) => sum + (Number(value) || 0),
			0
		);
		return `¥${(total / 100).toLocaleString('zh-CN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`;
	}

	function formatDateTime(value: DateValue): string {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '-';

		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
			date.getUTCDate()
		).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(
			date.getUTCMinutes()
		).padStart(2, '0')}`;
	}

	function openRejectDialog(application: Approval): void {
		rejectTarget = application;
	}

	function closeRejectDialog(): void {
		rejectTarget = null;
	}

	const columns: TableColumn<Approval>[] = [
		{
			key: 'selection',
			title: '选择',
			width: '3.5rem',
			align: 'center',
			customHeader: true,
			customCell: true
		},
		{ key: 'id', title: '申请编号', dataIndex: 'id', width: '8rem' },
		{ key: 'applicant', title: '申请人', width: '9rem', customCell: true },
		{ key: 'route', title: '行程', width: '14rem', customCell: true },
		{ key: 'reason', title: '出差事由', width: '16rem', customCell: true },
		{ key: 'budget', title: '预算合计', width: '9rem', customCell: true },
		{ key: 'submittedAt', title: '提交时间', width: '10rem', customCell: true },
		{
			key: 'actions',
			title: '操作',
			width: '15rem',
			align: 'right',
			customCell: true
		}
	];
</script>

<div class="min-h-full">
	<PageHeader title="待我审批" description={hasApprovalPermission ? pendingLabel : '当前角色没有审批权限'} />

	{#if form?.message}
		<p
			class="mb-4 rounded-lg border px-4 py-3 text-sm {form.success
				? 'border-emerald-200 bg-emerald-50 text-emerald-700'
				: 'border-red-200 bg-red-50 text-red-700'}"
			role="status"
		>
			{form.message}
		</p>
	{/if}

	{#if !hasApprovalPermission}
		<div class="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
			当前角色没有审批权限，请切换为经理或财务角色。
		</div>
	{:else if approvals.length === 0}
		<div class="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
			暂无待你审批的申请。
		</div>
	{:else}
		<div class="mb-3 flex flex-wrap items-center gap-3">
			<span class="text-sm text-slate-500">已选 {selectedIds.length} 项，共 {approvals.length} 条</span>

			<form method="POST" action="?/batchApprove" class="ml-auto">
				<input type="hidden" name="actorId" value={$currentUserState?.id ?? ''} />
				<input type="hidden" name="applicationIds" value={selectedPayload} />
				<button
					type="submit"
					disabled={selectedIds.length === 0}
					class="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					批量通过
				</button>
			</form>
		</div>

		<Table
			dataSource={approvals}
			{columns}
			rowKey="id"
			pagination={{
				pageSize: 5,
				pageSizeOptions: [5, 10, 20],
				resetKey: `${$currentUserState?.id ?? ''}-${$currentUserState?.role ?? ''}`
			}}
		>
			{#snippet header(context: TableHeaderContext<Approval>)}
				{#if context.column.key === 'selection'}
					<input
						type="checkbox"
						checked={allSelected}
						class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						aria-label="全选待审批申请"
						onchange={toggleAll}
					/>
				{/if}
			{/snippet}

			{#snippet cell(context: TableCellContext<Approval>)}
				{@const { column, record } = context}
				{#if column.key === 'selection'}
					<input
						type="checkbox"
						checked={selectedIds.includes(record.id)}
						class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						aria-label={`选择申请 ${record.id}`}
						onchange={() => toggleSelection(record.id)}
					/>
				{:else if column.key === 'applicant'}
					<div>
						<p class="font-medium text-slate-800">{record.applicantName}</p>
						<p class="mt-0.5 text-xs text-slate-500">{record.department}</p>
					</div>
				{:else if column.key === 'route'}
					<span class="block max-w-56 truncate text-slate-700" title={routeOf(record)}>
						{routeOf(record)}
					</span>
				{:else if column.key === 'reason'}
					{@const fields = fieldsOf(record)}
					<span class="block max-w-72 truncate" title={fields.reason ?? ''}>{fields.reason || '-'}</span>
				{:else if column.key === 'budget'}
					<span class="font-medium text-slate-800">{budgetOf(record)}</span>
				{:else if column.key === 'submittedAt'}
					<span class="text-slate-500">{formatDateTime(record.submittedAt)}</span>
				{:else if column.key === 'actions'}
					<div class="flex justify-end gap-3">
						<a
							href={`/requests/${record.id}?from=approvals`}
							class="inline-flex h-8 items-center text-sm font-medium transition-colors text-blue-600 hover:underline"
						>
							查看详情
						</a>
						<form method="POST" action="?/approve">
							<input type="hidden" name="actorId" value={$currentUserState?.id ?? ''} />
							<input type="hidden" name="applicationId" value={record.id} />
							<button
								type="submit"
								class="inline-flex h-8 items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							>
								通过
							</button>
						</form>
						<button
							type="button"
							class="inline-flex h-8 items-center text-sm font-medium text-red-600 transition-colors hover:text-red-700 hover:underline focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none"
							onclick={() => openRejectDialog(record)}
						>
							驳回
						</button>
					</div>
				{/if}
			{/snippet}
		</Table>
	{/if}
</div>

{#if rejectTarget}
	<RejectDialog
		applicationId={rejectTarget.id}
		actorId={$currentUserState?.id ?? ''}
		onClose={closeRejectDialog}
	/>
{/if}
