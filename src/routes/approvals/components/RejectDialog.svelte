<script lang="ts">
	type Props = {
		applicationId: string;
		actorId: string;
		onClose: () => void;
	};

	let { applicationId, actorId, onClose }: Props = $props();
	let rejectReason = $state('');
	let rejectReasonLength = $derived(rejectReason.trim().length);
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 py-6">
	<form
		method="POST"
		action="?/reject"
		class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl shadow-slate-900/20"
	>
		<input type="hidden" name="actorId" value={actorId} />
		<input type="hidden" name="applicationId" value={applicationId} />

		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-base font-semibold text-slate-950">驳回申请</h2>
				<p class="mt-1 text-xs leading-5 text-slate-500">
					请填写驳回理由（不超过 200 字），申请人会看到这条意见。
				</p>
			</div>
			<button
				type="button"
				class="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				aria-label="关闭驳回弹窗"
				onclick={onClose}
			>
				×
			</button>
		</div>

		<textarea
			name="rejectReason"
			bind:value={rejectReason}
			maxlength="200"
			required
			rows="4"
			placeholder="驳回理由（必填）"
			class="mt-4 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
		></textarea>

		<div class="mt-2 flex items-center justify-between gap-3">
			<p class="text-xs text-slate-400">申请编号：{applicationId}</p>
			<p class="text-xs {rejectReasonLength > 200 ? 'text-red-500' : 'text-slate-400'}">
				{rejectReasonLength}/200
			</p>
		</div>

		<div class="mt-5 flex justify-end gap-3">
			<button
				type="button"
				class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				onclick={onClose}
			>
				取消
			</button>
			<button
				type="submit"
				disabled={rejectReasonLength === 0}
				class="inline-flex h-9 items-center rounded-lg bg-rose-500 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-600 focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				确认驳回
			</button>
		</div>
	</form>
</div>
