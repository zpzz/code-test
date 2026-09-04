<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import RejectDialog from '../../approvals/components/RejectDialog.svelte';
	import { currentUserState } from '$lib/stores/user';
	import { APPLICATION_STATUS, TRANSPORT, URGENCY, USER_ROLE, enumService } from '$lib/enums';

	type TravelLeg = {
		id?: string;
		from?: string;
		to?: string;
		departDate?: string;
		returnDate?: string;
		transport?: string;
	};

	type TravelFields = {
		reason?: string;
		urgency?: string;
		legs?: TravelLeg[];
		budget?: {
			transport?: number;
			hotel?: number;
			allowance?: number;
			other?: number;
		};
		/** 预算超过 10,000 元时填写的补充说明。 */
		budgetNote?: string;
	};

	type DateValue = string | Date | null | undefined;

	let { data, form }: { data: PageData; form?: { success?: boolean; message?: string } } = $props();
	let application = $derived(data.application);
	let fields = $derived(application.fields as TravelFields);
	let legs = $derived(fields.legs ?? []);
	let budget = $derived(fields.budget ?? {});
	let showRejectDialog = $state(false);
	let backLink = $derived.by(() => {
		switch (page.url.searchParams.get('from')) {
			case 'approvals':
				return { href: '/approvals', label: '返回待我审批' };
			case 'stats':
				return { href: '/stats', label: '返回统计报表' };
			default:
				return { href: '/request', label: '返回我的申请' };
		}
	});

	const actionLabels: Record<string, string> = {
		submit: '提交申请',
		approve: '审批通过',
		reject: '驳回申请',
		cancel: '撤销申请',
		reedit: '重新编辑'
	};

	const budgetItems = [
		{ key: 'transport', label: '交通' },
		{ key: 'hotel', label: '住宿' },
		{ key: 'allowance', label: '补贴' },
		{ key: 'other', label: '其他' }
	] as const;

	let totalBudget = $derived(
		budgetItems.reduce((sum, item) => sum + (Number(budget[item.key]) || 0), 0)
	);

	let actionState = $derived.by(() => {
		const user = $currentUserState;
		const isApplicant = user?.id === application.applicantId;

		if (application.status === APPLICATION_STATUS.draft) {
			return isApplicant
					? {
							canManageDraft: true,
							canReedit: false,
							canApprove: false,
							canReject: false,
							canCancel: false,
							message: '草稿尚未提交，可继续编辑。'
						}
					: {
							canManageDraft: false,
							canReedit: false,
							canApprove: false,
							canReject: false,
							canCancel: false,
							message: '仅申请人可编辑这份草稿。'
						};
		}

		if (application.status === APPLICATION_STATUS.rejected) {
			return isApplicant
				? {
						canManageDraft: false,
						canReedit: true,
						canApprove: false,
						canReject: false,
						canCancel: false,
						message: '申请已被驳回，可修改后重新提交。'
					}
				: {
						canManageDraft: false,
						canReedit: false,
						canApprove: false,
						canReject: false,
						canCancel: false,
						message: '当前状态下没有可执行的操作。'
					};
		}

		if (application.status === APPLICATION_STATUS.pendingManager) {
			return isApplicant
				? {
						canManageDraft: false,
						canReedit: false,
						canApprove: false,
						canReject: false,
						canCancel: true,
						message: '申请正在等待经理审批，可撤销后重新处理。'
					}
				: user?.role === USER_ROLE.manager && !isApplicant
				? {
						canManageDraft: false,
						canReedit: false,
						canApprove: true,
						canReject: true,
						canCancel: false,
						message: '当前申请正等待您审批。'
					}
				: {
						canManageDraft: false,
						canReedit: false,
						canApprove: false,
						canReject: false,
						canCancel: false,
						message: '当前申请正在等待经理审批。'
					};
		}

		if (application.status === APPLICATION_STATUS.pendingFinance) {
			return isApplicant
				? {
						canManageDraft: false,
						canReedit: false,
						canApprove: false,
						canReject: false,
						canCancel: true,
						message: '申请正在等待财务审批，可撤销后重新处理。'
					}
				: user?.role === USER_ROLE.finance && !isApplicant
				? {
						canManageDraft: false,
						canReedit: false,
						canApprove: true,
						canReject: true,
						canCancel: false,
						message: '当前申请正等待您审批。'
					}
				: {
						canManageDraft: false,
						canReedit: false,
						canApprove: false,
						canReject: false,
						canCancel: false,
						message: '当前申请正在等待财务审批。'
					};
		}

		return {
			canManageDraft: false,
			canReedit: false,
			canApprove: false,
			canReject: false,
			canCancel: false,
			message: '当前状态下没有可执行的操作。'
		};
	});

	function formatDate(value: DateValue): string {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '-';

		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
			date.getUTCDate()
		).padStart(2, '0')}`;
	}

	function formatDateTime(value: DateValue): string {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '-';

		return `${formatDate(date)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(
			date.getUTCMinutes()
		).padStart(2, '0')}`;
	}

	function formatAmount(amount: number | undefined): string {
		return `¥${((Number(amount) || 0) / 100).toLocaleString('zh-CN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})}`;
	}

	function statusLabel(status: string): string {
		return enumService.label('applicationStatus', status);
	}
</script>

<a
	href={backLink.href}
	class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800"
>
	<span aria-hidden="true">←</span>
	{backLink.label}
</a>

<PageHeader title="申请详情" description={`单号 ${application.id}`}>
	{#snippet actions()}
		<span
			class={enumService.className(application.status)}
		>
			{statusLabel(application.status)}
		</span>
	{/snippet}
</PageHeader>

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

<div class="space-y-4">
	<section class="overflow-hidden rounded-lg border border-slate-200 bg-white">
		<div class="p-5 sm:p-6">
			<h2 class="text-sm font-semibold text-slate-900">基本信息</h2>

			<div class="mt-4 grid gap-x-12 gap-y-5 lg:grid-cols-2">
				<div class="space-y-5">
					<div>
						<p class="text-xs text-slate-500">出差事由</p>
						<p class="mt-1 text-sm leading-6 text-slate-900">{fields.reason || '-'}</p>
					</div>
					<div>
						<p class="text-xs text-slate-500">紧急程度</p>
						<p class="mt-1 text-sm text-slate-900">
							{enumService.label('urgency', fields.urgency ?? URGENCY.normal)}
						</p>
					</div>
					<div>
						<p class="text-xs text-slate-500">提交时间</p>
						<p class="mt-1 text-sm text-slate-900">{formatDate(application.submittedAt)}</p>
					</div>
				</div>

				<div class="space-y-5">
					<div>
						<p class="text-xs text-slate-500">申请人</p>
						<p class="mt-1 text-sm text-slate-900">
							{application.applicantName} · {application.department}
						</p>
					</div>
					<div>
						<p class="text-xs text-slate-500">创建时间</p>
						<p class="mt-1 text-sm text-slate-900">{formatDate(application.createdAt)}</p>
					</div>
				</div>
			</div>

			<div class="mt-7">
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-semibold text-slate-900">行程明细</h2>
					<span class="text-xs text-slate-500">共 {legs.length} 段</span>
				</div>

				<div class="mt-3 overflow-x-auto">
					<table class="min-w-[46rem] w-full text-left text-sm">
						<thead class="border-y border-slate-200 text-xs font-medium text-slate-500">
							<tr>
								<th scope="col" class="px-3 py-3 font-medium">#</th>
								<th scope="col" class="px-3 py-3 font-medium">出发地</th>
								<th scope="col" class="px-3 py-3 font-medium">目的地</th>
								<th scope="col" class="px-3 py-3 font-medium">出发日期</th>
								<th scope="col" class="px-3 py-3 font-medium">返回日期</th>
								<th scope="col" class="px-3 py-3 font-medium">交通方式</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 text-slate-800">
							{#if legs.length === 0}
								<tr>
									<td colspan="6" class="px-3 py-8 text-center text-slate-400">暂无行程信息</td>
								</tr>
							{:else}
								{#each legs as leg, index (leg.id ?? `${leg.from}-${leg.to}-${index}`)}
									<tr>
										<td class="px-3 py-3">{index + 1}</td>
										<td class="px-3 py-3">{leg.from || '-'}</td>
										<td class="px-3 py-3">{leg.to || '-'}</td>
										<td class="px-3 py-3">{formatDate(leg.departDate)}</td>
										<td class="px-3 py-3">{formatDate(leg.returnDate)}</td>
										<td class="px-3 py-3">
											{enumService.label('transport', leg.transport ?? TRANSPORT.other)}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<div class="mt-6">
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-semibold text-slate-900">费用预算</h2>
					<span class="text-xs text-slate-500">合计 {formatAmount(totalBudget)}</span>
				</div>

				<dl class="mt-3 divide-y divide-slate-100 border-y border-slate-200">
					{#each budgetItems as item (item.key)}
						<div class="flex items-center justify-between py-2.5 text-sm">
							<dt class="text-slate-500">{item.label}</dt>
							<dd class="font-medium text-slate-800">{formatAmount(budget[item.key])}</dd>
						</div>
					{/each}
					<div class="flex items-center justify-between py-3 text-sm">
						<dt class="font-semibold text-slate-900">合计</dt>
						<dd class="font-semibold text-slate-900">{formatAmount(totalBudget)}</dd>
					</div>
				</dl>

				<div class="mt-4">
					<p class="text-xs text-slate-500">预算说明</p>
					<p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
						{fields.budgetNote?.trim() || '-'}
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="overflow-hidden rounded-lg border border-slate-200 bg-white">
		<div class="border-b border-slate-200 px-5 py-4 sm:px-6">
			<h2 class="text-sm font-semibold text-slate-900">审批记录</h2>
		</div>

		{#if application.auditLogs.length === 0}
			<p class="px-5 py-8 text-center text-sm text-slate-400 sm:px-6">暂无审批记录</p>
		{:else}
			<ol class="px-5 py-5 sm:px-6">
				{#each application.auditLogs as audit, index (audit.id)}
					<li class="relative flex gap-3 pb-5 last:pb-0">
						{#if index < application.auditLogs.length - 1}
							<span class="absolute left-[5px] top-3 h-full w-px bg-slate-200"></span>
						{/if}
						<span class="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-4 ring-white"></span>
						<div class="min-w-0">
							<p class="text-sm text-slate-700">
								<span class="font-semibold text-slate-900">{audit.actorName}</span>
								<span class="ml-1">{actionLabels[audit.action] ?? audit.action}</span>
								<span class="mx-1 text-slate-400">·</span>
								<span class="text-slate-500">
									{statusLabel(audit.fromStatus)} → {statusLabel(audit.toStatus)}
								</span>
							</p>
							{#if audit.comment}
								<p class="mt-1 text-sm text-slate-500">{audit.comment}</p>
							{/if}
							<p class="mt-1 text-xs text-slate-400">{formatDateTime(audit.at)}</p>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<div class="flex min-h-12 items-center justify-end">
		{#if actionState.canManageDraft}
			<div class="flex flex-wrap justify-end gap-3">
				<button
					type="button"
					disabled
					title="提交功能暂未接入"
					class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white opacity-50"
				>
					提交申请
				</button>
				<a
					href={`/create?edit=${application.id}`}
					class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					重新编辑
				</a>
				<button
					type="button"
					disabled
					title="删除功能暂未接入"
					class="inline-flex h-9 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 opacity-50"
				>
					删除
				</button>
			</div>
		{:else if actionState.canReedit}
			<a
				href={`/create?edit=${application.id}`}
				class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				重新编辑
			</a>
		{:else if actionState.canApprove && actionState.canReject}
			<div class="flex flex-wrap justify-end gap-3">
				<form method="POST" action="?/approve">
					<input type="hidden" name="actorId" value={$currentUserState?.id ?? ''} />
					<button
						type="submit"
						class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						通过
					</button>
				</form>
				<button
					type="button"
					class="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none"
					onclick={() => (showRejectDialog = true)}
				>
					驳回
				</button>
			</div>
		{:else if actionState.canCancel}
			<form method="POST" action="?/cancel" class="flex justify-end">
				<input type="hidden" name="actorId" value={$currentUserState?.id ?? ''} />
				<button
					type="submit"
					class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-red-300 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
				>
					撤销
				</button>
			</form>
		{:else}
			<p class="text-sm text-slate-400">{actionState.message}</p>
		{/if}
	</div>
</div>

{#if showRejectDialog}
	<RejectDialog
		applicationId={application.id}
		actorId={$currentUserState?.id ?? ''}
		onClose={() => (showRejectDialog = false)}
	/>
{/if}
