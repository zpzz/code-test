<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RejectDialog from './components/RejectDialog.svelte';
	import Table, {
		type TableCellContext,
		type TableColumn,
		type TableHeaderContext
	} from '$lib/components/common/Table.svelte';
	import { formatDateTime } from '$lib/format/date';
	import { currentUserState } from '$lib/stores/user';
	import { APPLICATION_STATUS, USER_ROLE, enumService } from '$lib/enums';
	import { APPLICATION_TYPES, type ApplicationType } from '$lib/domain/applicationTypes';
	import {
		applicationBudgetTotalOf,
		applicationFieldsOf,
		applicationLeaveRangeOf,
		applicationLeaveTypeOf,
		applicationRouteOf,
		centsToYuan,
		formatAmount
	} from '$lib/utils';
	type Approval = PageData['applications'][number];

	let { data, form }: { data: PageData; form?: { success?: boolean; message?: string } } = $props();
	let selectedIds = $state<string[]>([]);
	let rejectTarget = $state<Approval | null>(null);

	let approvals = $derived(data.applications);
	let applicationType = $derived((data.applicationType ?? 'travel') as ApplicationType);
	let listConfig = $derived(APPLICATION_TYPES[applicationType].list);

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
		{ key: 'route', title: listConfig.detailTitle, width: '14rem', customCell: true },
		{ key: 'reason', title: listConfig.reasonTitle, width: '16rem', customCell: true },
		{ key: 'budget', title: listConfig.amountTitle, width: '9rem', customCell: true },
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
				<!-- 根据列定义渲染待审批表格中的自定义单元格内容。 -->
				{#if column.key === 'selection'}
					<!-- 单选框只负责维护当前页面已选择的申请编号。 -->
					<input
						type="checkbox"
						checked={selectedIds.includes(record.id)}
						class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						aria-label={`选择申请 ${record.id}`}
						onchange={() => toggleSelection(record.id)}
					/>
				{:else if column.key === 'applicant'}
					<!-- 申请人同时展示姓名和所属部门，便于审批人快速识别。 -->
					<div>
						<p class="font-medium text-slate-800">{record.applicantName}</p>
						<p class="mt-0.5 text-xs text-slate-500">{record.department}</p>
					</div>
				{:else if column.key === 'route'}
					<!-- 申请明细根据申请类型展示行程或请假时间。 -->
					{@const detail =
						applicationType === 'leave'
							? applicationLeaveRangeOf(record)
							: applicationRouteOf(record)}
					<span class="block max-w-56 truncate text-slate-700" title={detail}>
						{detail}
					</span>
				{:else if column.key === 'reason'}
					<!-- 出差事由同样采用截断展示，避免影响表格布局。 -->
					<span class="block max-w-72 truncate" title={applicationFieldsOf(record).reason ?? ''}>
						{applicationFieldsOf(record).reason || '-'}
					</span>
				{:else if column.key === 'budget'}
					<!-- 差旅展示预算金额，请假展示请假类型。 -->
					{#if applicationType === 'leave'}
						<span class="font-medium text-slate-800">{applicationLeaveTypeOf(record)}</span>
					{:else}
						<span class="font-medium text-slate-800">
							{formatAmount(centsToYuan(applicationBudgetTotalOf(record)))}
						</span>
					{/if}
				{:else if column.key === 'submittedAt'}
					<!-- 提交时间统一使用公共日期格式化方法展示。 -->
					<span class="text-slate-500">{formatDateTime(record.submittedAt)}</span>
				{:else if column.key === 'actions'}
					<!-- 操作列提供详情、通过和驳回三个审批动作。 -->
					<div class="flex justify-end gap-3">
						<a
							href={`/requests/${record.id}?from=approvals`}
							class="inline-flex h-8 items-center text-sm font-medium transition-colors text-blue-600 hover:underline"
						>
							查看详情
						</a>
						<!-- 通过操作只提交申请编号，审批人身份由服务端 cookie 识别。 -->
						<form method="POST" action="?/approve">
							<input type="hidden" name="applicationId" value={record.id} />
							<button
								type="submit"
								class="inline-flex h-8 items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							>
								通过
							</button>
						</form>
						<!-- 驳回需要先打开弹框填写理由，再提交驳回操作。 -->
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
	<RejectDialog applicationId={rejectTarget.id} onClose={closeRejectDialog} />
{/if}
