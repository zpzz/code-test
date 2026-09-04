<script lang="ts">
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { currentUserState } from '$lib/stores/user';
	import { TRANSPORT, URGENCY, enumService, type TransportValue } from '$lib/enums';
	import { centsToYuan, formatAmount, getEnumLabel } from '$lib/utils';

	// 行程和表单数据的类型定义，表单提交时会序列化为 fields。
	type Transport = TransportValue;

	type TravelLeg = {
		/** 当前行程段的唯一标识，用于列表渲染和删除操作。 */
		id: string;
		/** 行程段的出发地。 */
		from: string;
		/** 行程段的目的地。 */
		to: string;
		/** 行程段的出发日期，格式为 YYYY-MM-DD。 */
		departDate: string;
		/** 行程段的返回日期，格式为 YYYY-MM-DD。 */
		returnDate: string;
		/** 行程段使用的交通方式枚举值。 */
		transport: Transport;
	};

	type TravelForm = {
		/** 本次出差的事由、背景和目的。 */
		reason: string;
		/** 本次申请的紧急程度枚举值。 */
		urgency: typeof URGENCY.normal | typeof URGENCY.urgent;
		/** 本次申请包含的全部行程段。 */
		legs: TravelLeg[];
		/** 本次申请的分项预算，单位为元。 */
		budget: {
			/** 交通费用预算。 */
			transport: number;
			/** 住宿费用预算。 */
			hotel: number;
			/** 出差补贴预算。 */
			allowance: number;
			/** 其他费用预算。 */
			other: number;
		};
		/** 对预算构成或特殊费用的补充说明。 */
		budgetNote: string;
	};

	type StoredFields = Partial<TravelForm>;

	// 发起申请的四个步骤，当前步骤的描述会显示在页面标题下方。
	const steps = [
		{ title: '基本信息', description: '出差事由与紧急程度' },
		{ title: '行程明细', description: '出发地、目的地与日期' },
		{ title: '费用预算', description: '分项预算与说明' },
		{ title: '预览确认', description: '核对信息后提交' }
	] as const;

	// 下拉框和单选框统一从枚举服务获取 label/value。
	const transportOptions = enumService.options('transport');
	const urgencyOptions = enumService.options('urgency');

	// 费用项目使用配置驱动，避免表单和预览区域重复维护字段。
	const budgetItems = [
		{ key: 'transport', label: '交通费' },
		{ key: 'hotel', label: '住宿费' },
		{ key: 'allowance', label: '补贴' },
		{ key: 'other', label: '其他' }
	] as const;

	const inputClass =
		'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

	// 页面数据、当前步骤、校验提示和申请表单状态。
	let { data, form }: { data: PageData; form?: { message?: string } } = $props();
	let currentStep = $state(0);
	let attempted = $state(false);
	let loadedApplicationId = $state<string | null>(null);
	let applicationForm = $state<TravelForm>({
		reason: '',
		urgency: URGENCY.normal,
		legs: [createLeg()],
		budget: {
			transport: 0,
			hotel: 0,
			allowance: 0,
			other: 0
		},
		budgetNote: ''
	});

	let isEditing = $derived(Boolean(data.application));
	let activeStep = $derived(steps[currentStep]);
	let budgetTotal = $derived(
		budgetItems.reduce((total, item) => total + (Number(applicationForm.budget[item.key]) || 0), 0)
	);
	let serializedForm = $derived(JSON.stringify(applicationForm));

	// 编辑申请时，将服务端数据回填到当前表单；只处理一次同一条申请。
	$effect(() => {
		if (!data.application || data.application.id === loadedApplicationId) return;

		const fields = data.application.fields as StoredFields;
		const storedBudget: any = fields.budget ?? {};
		applicationForm.reason = fields.reason ?? '';
		applicationForm.urgency = fields.urgency === URGENCY.urgent ? URGENCY.urgent : URGENCY.normal;
		applicationForm.legs = fields.legs?.map((leg, index) => ({
			id: leg.id || `leg-${index + 1}`,
			from: leg.from ?? '',
			to: leg.to ?? '',
			departDate: leg.departDate ?? '',
			returnDate: leg.returnDate ?? '',
			transport: isTransport(leg.transport) ? leg.transport : TRANSPORT.train
		})) ?? [createLeg()];
		applicationForm.budget = {
			transport: centsToYuan(storedBudget.transport),
			hotel: centsToYuan(storedBudget.hotel),
			allowance: centsToYuan(storedBudget.allowance),
			other: centsToYuan(storedBudget.other)
		};
		applicationForm.budgetNote = fields.budgetNote ?? '';
		loadedApplicationId = data.application.id;
	});

	// 创建一段带有默认交通方式的行程。
	function createLeg(): TravelLeg {
		return {
			id: `leg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
			from: '',
			to: '',
			departDate: '',
			returnDate: '',
			transport: TRANSPORT.train
		};
	}

	// 校验后端返回的交通方式，未知值统一回退为默认值。
	function isTransport(value: unknown): value is Transport {
		return typeof value === 'string' && enumService.has('transport', value);
	}

	// 第一步：事由长度需要满足业务规则。
	function isBasicComplete(): boolean {
		return (
			applicationForm.reason.trim().length >= 10 && applicationForm.reason.trim().length <= 200
		);
	}

	// 第二步：至少填写一段完整且日期有效的行程。
	function isLegsComplete(): boolean {
		return applicationForm.legs.length > 0 && applicationForm.legs.every(isLegComplete);
	}

	// 单段行程的出发地、目的地和日期校验。
	function isLegComplete(leg: TravelLeg): boolean {
		return Boolean(
			leg.from.trim() &&
			leg.to.trim() &&
			leg.from.trim() !== leg.to.trim() &&
			leg.departDate &&
			leg.returnDate &&
			leg.returnDate >= leg.departDate
		);
	}

	// 第三步：预算必须大于 0，超过 10,000 元时必须填写说明。
	function isBudgetComplete(): boolean {
		return budgetTotal > 0 && !(budgetTotal > 10000 && !applicationForm.budgetNote.trim());
	}

	// 根据步骤索引判断该步骤是否已完成。
	function isStepComplete(index: number): boolean {
		if (index === 0) return isBasicComplete();
		if (index === 1) return isLegsComplete();
		if (index === 2) return isBudgetComplete();
		return isBasicComplete() && isLegsComplete() && isBudgetComplete();
	}

	// 只有前置步骤完成后，用户才能跳转到后续步骤。
	function isReachable(index: number): boolean {
		if (index <= currentStep) return true;
		return Array.from({ length: index }, (_, step) => isStepComplete(step)).every(Boolean);
	}

	// 校验当前步骤，通过后进入下一步。
	function nextStep(): void {
		attempted = true;
		if (!isStepComplete(currentStep)) return;
		attempted = false;
		currentStep = Math.min(currentStep + 1, steps.length - 1);
		console.info("🚀 ~ nextStep ~ currentStep:", applicationForm)
	}

	// 返回上一步时清除当前的校验提示。
	function previousStep(): void {
		attempted = false;
		currentStep = Math.max(currentStep - 1, 0);
	}

	// 点击步骤导航时，仅允许跳转到已完成前置步骤的步骤。
	function selectStep(index: number): void {
		if (!isReachable(index)) return;
		attempted = false;
		currentStep = index;
	}

	// 行程最多添加 10 段。
	function addLeg(): void {
		if (applicationForm.legs.length < 10) applicationForm.legs.push(createLeg());
	}

	// 删除指定行程段。
	function removeLeg(index: number): void {
		applicationForm.legs.splice(index, 1);
	}
</script>

<!-- 编辑已有申请时返回我的申请列表。 -->
{#if isEditing}
	<a
		href="/request"
		class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800"
	>
		<span aria-hidden="true">←</span>
		返回我的申请
	</a>
{/if}

<PageHeader
	title={isEditing ? '编辑差旅申请' : '发起差旅申请'}
	description={activeStep.description}
/>

<!-- 四步导航：已完成的前置步骤可以点击返回。 -->
<ol class="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="申请步骤">
	{#each steps as step, index (step.title)}
		<li class="flex items-center gap-2">
			<button
				type="button"
				disabled={!isReachable(index)}
				aria-current={currentStep === index ? 'step' : undefined}
				class="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-600 {currentStep ===
				index
					? 'bg-blue-50 font-medium text-blue-700'
						: isStepComplete(index)
							? 'text-slate-600 hover:bg-slate-100'
							: 'font-medium text-slate-600'}"
				onclick={() => selectStep(index)}
			>
				<span
					class="grid h-5 w-5 place-items-center rounded-full text-xs {currentStep === index
						? 'bg-blue-600 text-white'
						: isStepComplete(index)
							? 'bg-emerald-100 text-emerald-700'
							: 'border border-slate-300 bg-white text-slate-600'}"
				>
					{index + 1}
				</span>
				{step.title}
			</button>
			{#if index < steps.length - 1}
				<span class="text-sm text-slate-400" aria-hidden="true">→</span>
			{/if}
		</li>
	{/each}
</ol>

<!-- 通过不同 formaction 区分保存草稿和正式提交。 -->
<form method="POST">
	<input type="hidden" name="fields" value={serializedForm} />
	<input type="hidden" name="applicantId" value={$currentUserState?.id ?? ''} />
	{#if data.application}
		<input type="hidden" name="editId" value={data.application.id} />
	{/if}

	<section class="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
		<!-- 步骤一：填写出差事由和紧急程度。 -->
		{#if currentStep === 0}
			<div class="space-y-5">
				<label class="block">
					<span class="text-sm font-medium text-slate-800">
						出差事由 <span class="text-red-500">*</span>
					</span>
					<textarea
						class="{inputClass} mt-2 min-h-28 resize-y"
						rows="4"
						placeholder="请说明出差背景、目的与大致安排"
						bind:value={applicationForm.reason}
						aria-invalid={attempted && !isBasicComplete()}></textarea>
					<div class="mt-1 flex justify-between text-xs">
						{#if attempted && !isBasicComplete()}
							<span class="text-red-600">出差事由请填写 10 至 200 个字</span>
						{:else}
							<span class="text-slate-400">请简要说明出差背景、目的与安排</span>
						{/if}
						<span class="text-slate-400">{applicationForm.reason.trim().length}/200</span>
					</div>
				</label>

				<fieldset>
					<legend class="text-sm font-medium text-slate-800">
						紧急程度 <span class="text-red-500">*</span>
					</legend>
					<div class="mt-2 flex items-center gap-5 text-sm text-slate-700">
						{#each urgencyOptions as option (option.value)}
							<label class="inline-flex items-center gap-2">
								<input
									type="radio"
									name="urgency"
									value={option.value}
									bind:group={applicationForm.urgency}
								/>
								{option.label}
							</label>
						{/each}
					</div>
				</fieldset>
			</div>
			<!-- 步骤二：维护一段或多段出差行程。 -->
		{:else if currentStep === 1}
			<fieldset class="rounded-lg border border-slate-200 px-5 pt-2 pb-3">
				<legend class="px-1.5 text-sm font-semibold text-slate-700">行程明细</legend>

				<div class="space-y-3">
					{#each applicationForm.legs as leg, index (leg.id)}
						<div class="border-b border-dashed border-slate-200 pb-3">
							<div class="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
								<label class="block">
									<span class="text-sm font-medium text-slate-700">
										出发地 <span class="text-rose-500">*</span>
									</span>
									<input
										class="{inputClass} mt-2"
										placeholder="例如：北京"
										bind:value={leg.from}
										aria-label={`第 ${index + 1} 段出发地`}
									/>
								</label>
								<label class="block">
									<span class="text-sm font-medium text-slate-700">
										目的地 <span class="text-rose-500">*</span>
									</span>
									<input
										class="{inputClass} mt-2"
										placeholder="例如：上海"
										bind:value={leg.to}
										aria-label={`第 ${index + 1} 段目的地`}
									/>
								</label>
								<label class="block">
									<span class="text-sm font-medium text-slate-700">
										出发日期 <span class="text-rose-500">*</span>
									</span>
									<input
										class="{inputClass} mt-2"
										type="date"
										bind:value={leg.departDate}
										aria-label={`第 ${index + 1} 段出发日期`}
									/>
								</label>
								<label class="block">
									<span class="text-sm font-medium text-slate-700">
										返回日期 <span class="text-rose-500">*</span>
									</span>
									<input
										class="{inputClass} mt-2"
										type="date"
										bind:value={leg.returnDate}
										aria-label={`第 ${index + 1} 段返回日期`}
									/>
								</label>
								<label class="block">
									<span class="text-sm font-medium text-slate-700">
										交通方式 <span class="text-rose-500">*</span>
									</span>
									<select
										class="{inputClass} mt-2"
										bind:value={leg.transport}
										aria-label={`第 ${index + 1} 段交通方式`}
									>
										{#each transportOptions as option (option.value)}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</label>
								<button
									type="button"
									class="h-9 self-end text-sm text-rose-600 transition-colors hover:text-rose-700"
									aria-label={`删除第 ${index + 1} 段行程`}
									onclick={() => removeLeg(index)}
								>
									删除
								</button>
							</div>
							{#if attempted && !isLegComplete(leg)}
								<p class="mt-2 text-xs text-rose-600">
									请完善行程信息，且返回日期不得早于出发日期，出发地与目的地不能相同。
								</p>
							{/if}
						</div>
					{/each}
				</div>

				<button
					type="button"
					disabled={applicationForm.legs.length >= 10}
					class="mt-3 inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={addLeg}
				>
					添加行程段
				</button>
			</fieldset>
			<!-- 步骤三：填写分项预算和预算说明。 -->
		{:else if currentStep === 2}
			<div class="space-y-5">
				<fieldset class="rounded-lg border border-slate-200 px-5 pt-2 pb-2">
					<legend class="px-1.5 text-sm font-semibold text-slate-700">分项预算</legend>
					<div class="space-y-3">
						{#each budgetItems as item (item.key)}
							<label class="block">
								<span class="text-sm font-medium text-slate-700">
									{item.label} <span class="text-rose-500">*</span>
								</span>
								<input
									class="{inputClass} mt-2"
									type="number"
									min="0"
									step="0.01"
									inputmode="decimal"
									bind:value={applicationForm.budget[item.key]}
								/>
							</label>
						{/each}
					</div>
				</fieldset>

				<label class="block">
					<span class="text-sm font-medium text-slate-700">预算说明</span>
					<textarea
						class="{inputClass} mt-2 min-h-28 resize-y"
						rows="4"
						maxlength="200"
						bind:value={applicationForm.budgetNote}></textarea>
					<p class="mt-1 text-right text-xs text-slate-400">预算超过 10,000 元时需填写说明</p>
					{#if attempted && !isBudgetComplete()}
						<p class="mt-1 text-xs text-red-600">
							{budgetTotal <= 0 ? '预算合计需大于 0。' : '预算超过 10,000 元，请填写说明。'}
						</p>
					{/if}
				</label>
			</div>
			<!-- 步骤四：展示提交前的完整信息预览。 -->
		{:else}
			<div class="space-y-5 text-sm">
				<div>
					<h2 class="font-semibold text-slate-800">出差事由</h2>
					<p class="mt-2 leading-6 text-slate-700">{applicationForm.reason || '-'}</p>
				</div>

				<div>
					<h2 class="font-semibold text-slate-800">紧急程度</h2>
					<p class="mt-2 text-slate-700">
						{getEnumLabel(urgencyOptions, applicationForm.urgency)}
					</p>
				</div>

				<div>
					<h2 class="font-semibold text-slate-800">行程明细</h2>
					<div class="mt-2 overflow-x-auto">
						<table class="w-full min-w-[42rem] border-collapse text-left text-sm">
							<thead class="border border-slate-200 bg-slate-50 text-slate-700">
								<tr>
									<th scope="col" class="border-r border-slate-200 px-3 py-2 font-medium">出发地</th
									>
									<th scope="col" class="border-r border-slate-200 px-3 py-2 font-medium">目的地</th
									>
									<th scope="col" class="border-r border-slate-200 px-3 py-2 font-medium"
										>出发日期</th
									>
									<th scope="col" class="border-r border-slate-200 px-3 py-2 font-medium"
										>返回日期</th
									>
									<th scope="col" class="px-3 py-2 font-medium">交通方式</th>
								</tr>
							</thead>
							<tbody class="border border-slate-200 text-slate-800">
								{#each applicationForm.legs as leg (leg.id)}
									<tr>
										<td class="border-t border-r border-slate-200 px-3 py-2">{leg.from || '-'}</td>
										<td class="border-t border-r border-slate-200 px-3 py-2">{leg.to || '-'}</td>
										<td class="border-t border-r border-slate-200 px-3 py-2"
											>{leg.departDate || '-'}</td
										>
										<td class="border-t border-r border-slate-200 px-3 py-2"
											>{leg.returnDate || '-'}</td
										>
										<td class="border-t border-slate-200 px-3 py-2">
											{getEnumLabel(transportOptions, leg.transport)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<div>
					<h2 class="font-semibold text-slate-800">分项预算</h2>
					<dl class="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
						{#each budgetItems as item (item.key)}
							<div class="flex items-center gap-2">
								<dt class="text-slate-500">{item.label}</dt>
								<dd class="font-medium text-slate-800">
									{formatAmount(applicationForm.budget[item.key])}
								</dd>
							</div>
						{/each}
					</dl>
					<dl class="mt-3">
						<div class="flex items-center gap-2">
							<dt class="font-medium text-slate-800">预算合计：</dt>
							<dd class="font-semibold text-slate-900">{formatAmount(budgetTotal)}</dd>
						</div>
					</dl>
				</div>

				<div>
					<h2 class="font-semibold text-slate-800">预算说明</h2>
					<p class="mt-2 leading-6 text-slate-700">{applicationForm.budgetNote.trim() || '-'}</p>
				</div>
			</div>
		{/if}
	</section>

	{#if form?.message}
		<p class="mt-3 text-sm text-red-600" role="alert">{form.message}</p>
	{/if}

	<!-- 底部操作区：步骤切换、保存草稿和提交申请。 -->
	<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
		<div>
			{#if currentStep > 0}
				<button
					type="button"
					class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
					onclick={previousStep}
				>
					上一步
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if !isEditing}
				<button
					type="submit"
					formaction="?/save"
					class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600"
				>
					存为草稿
				</button>
			{/if}

			{#if currentStep < steps.length - 1}
				<button
					type="button"
					class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					onclick={nextStep}
				>
					下一步
				</button>
			{:else}
				<button
					type="submit"
					formaction="?/submit"
					class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
				>
					{isEditing ? '重新提交' : '提交申请'}
				</button>
			{/if}
		</div>
	</div>
</form>
