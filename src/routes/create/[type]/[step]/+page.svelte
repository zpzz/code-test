<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentUserState } from '$lib/stores/user';
	import { get } from 'svelte/store';
	import { wizardDraft } from '$lib/stores/wizardDraft';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DynamicField from '$lib/components/form/DynamicField.svelte';
	import {
		APPLICATION_TYPES,
		type ApplicationType
	} from '$lib/domain/applicationTypes';
	import { stepHref, stepsOf } from '$lib/domain/wizard';
	import {
		createInitialFields,
		displayValue,
		flattenPreviewFields,
		mergeInitialFields,
		toFormFields,
		validateField,
		valueForPreview,
		type FormValue
	} from '$lib/utils/application-wizard';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form?: { message?: string } } = $props();
	const type = $derived((page.params.type ?? data.type) as ApplicationType);
	const definition = $derived(APPLICATION_TYPES[type]);
	const steps = $derived(stepsOf(type));
	const currentStepSlug = $derived(page.params.step ?? data.step);
	const currentIndex = $derived(
		Math.max(
			0,
			steps.findIndex((step) => step.slug === currentStepSlug)
		)
	);
	const currentStep = $derived(steps[currentIndex] ?? steps[0]);
	const isEditing = $derived(Boolean(data.application));

	let attempted = $state(false);
	let loadedFormKey = $state<string | null>(null);
	let fields = $state<FormValue>({});

	$effect(() => {
		const formKey = `${type}:${data.application?.id ?? 'new'}`;
		if (formKey === loadedFormKey) return;

		const cachedDraft = get(wizardDraft);
		const storageKey = `application-wizard:${formKey}`;
		let storedFields: FormValue | null = null;

		if (browser) {
			try {
				const storedValue = sessionStorage.getItem(storageKey);
				storedFields = storedValue ? (JSON.parse(storedValue) as FormValue) : null;
			} catch {
				storedFields = null;
			}
		}

		fields = storedFields
			? mergeInitialFields(
					definition.steps.flatMap((step) => step.fields),
					storedFields
				)
			: cachedDraft?.key === formKey
				? mergeInitialFields(
						definition.steps.flatMap((step) => step.fields),
						cachedDraft.fields
					)
				: data.application
					? toFormFields(
							definition.steps.flatMap((step) => step.fields),
							data.application.fields as FormValue
						)
					: createInitialFields(definition.steps.flatMap((step) => step.fields));
		wizardDraft.set({ key: formKey, fields });
		loadedFormKey = formKey;
		attempted = false;
	});

	/**
	 * 同步更新当前表单、共享草稿 store 和 sessionStorage。
	 *
	 * 路由切换时页面会重新创建，因此需要同时保留内存外的草稿数据。
	 */
	function persistFields(nextFields: FormValue): void {
		const formKey = loadedFormKey ?? `${type}:new`;
		fields = nextFields;
		wizardDraft.set({ key: formKey, fields: nextFields });
		if (browser) {
			sessionStorage.setItem(`application-wizard:${formKey}`, JSON.stringify(nextFields));
		}
	}

	/**
	 * 更新一个顶层字段，并保留 group 字段中尚未修改的子字段。
	 */
	function updateField(key: string, value: unknown): void {
		const previousValue = fields[key];
		const nextValue =
			previousValue &&
			typeof previousValue === 'object' &&
			!Array.isArray(previousValue) &&
			value &&
			typeof value === 'object' &&
			!Array.isArray(value)
				? { ...(previousValue as FormValue), ...(value as FormValue) }
				: value;

		persistFields({ ...fields, [key]: nextValue });
	}

	/**
	 * 判断步骤是否已完成，用于步骤导航的视觉状态和可达性判断。
	 */
	function isStepComplete(index: number): boolean {
		// 未到达的步骤不能因为默认值或预览类型而显示为已完成。
		if (index > currentIndex) return false;

		const step = steps[index];
		if (step.kind === 'preview') return index < currentIndex;
		return step.fields.every((field) => validateField(field, fields[field.key]));
	}

	/**
	 * 判断用户是否可以跳转到目标步骤。
	 *
	 * 只有当前步骤以前的步骤全部完成，后续步骤才允许点击进入。
	 */
	function isReachable(index: number): boolean {
		return index <= currentIndex || Array.from({ length: index }, (_, item) => isStepComplete(item)).every(Boolean);
	}

	/**
	 * 跳转到指定步骤，并保留当前编辑模式参数。
	 */
	async function goToStep(index: number): Promise<void> {
		if (!isReachable(index)) return;
		await goto(stepHref(type, steps[index].slug, page.url.searchParams.get('edit')), {
			keepFocus: true,
			noScroll: true
		});
	}

	/**
	 * 校验当前步骤并进入下一步。
	 */
	function nextStep(): void {
		attempted = true;
		if (!isStepComplete(currentIndex)) return;
		attempted = false;
		if (currentIndex < steps.length - 1) goToStep(currentIndex + 1);
	}

	/**
	 * 返回上一步，同时清除当前步骤的校验提示。
	 */
	function previousStep(): void {
		attempted = false;
		if (currentIndex > 0) goToStep(currentIndex - 1);
	}

	/**
	 * 提交或保存草稿前清除客户端临时草稿，避免下次打开时重复回填。
	 */
	function clearDraftBeforeSubmit(): void {
		wizardDraft.set(null);
		if (browser) {
			sessionStorage.removeItem(`application-wizard:${loadedFormKey ?? `${type}:new`}`);
		}
	}
</script>

{#if isEditing}
	<a href="/request" class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
		<span aria-hidden="true">←</span>
		返回我的申请
	</a>
{/if}

<PageHeader title={isEditing ? `编辑${definition.label}` : `发起${definition.label}`} description={currentStep.description} />

<ol class="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="申请步骤">
	{#each steps as step, index (step.slug)}
		<li class="flex items-center gap-2">
			<button
				type="button"
				disabled={!isReachable(index)}
				aria-current={index === currentIndex ? 'step' : undefined}
				class="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-400 {index === currentIndex
					? 'bg-blue-50 font-medium text-blue-700'
					: isStepComplete(index)
						? 'text-slate-600 hover:bg-slate-100'
						: 'text-slate-500'}"
				onclick={() => goToStep(index)}
			>
				<span class="grid h-5 w-5 place-items-center rounded-full text-xs {index === currentIndex
					? 'bg-blue-600 text-white'
					: isStepComplete(index)
						? 'bg-emerald-100 text-emerald-700'
						: 'border border-slate-300 bg-white text-slate-600'}">{index + 1}</span>
				{step.title}
			</button>
			{#if index < steps.length - 1}<span class="text-slate-400" aria-hidden="true">→</span>{/if}
		</li>
	{/each}
</ol>

<form method="POST">
	<input type="hidden" name="fields" value={JSON.stringify(fields)} />
	<input type="hidden" name="applicantId" value={$currentUserState?.id ?? ''} />
	{#if data.application}<input type="hidden" name="editId" value={data.application.id} />{/if}

	{#key currentStep.slug}
		<section class="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
			{#if currentStep.kind === 'form'}
				<div class="space-y-5">
					{#each currentStep.fields as field (field.key)}
						<DynamicField
							{field}
							value={fields[field.key]}
							onChange={(value) => updateField(field.key, value)}
						/>
						{#if attempted && !validateField(field, fields[field.key])}
							<p class="mt-1 text-xs text-rose-600">请完善「{field.label}」</p>
						{/if}
					{/each}
				</div>
			{:else}
				<div class="space-y-5 text-sm">
					{#each flattenPreviewFields(steps.flatMap((step) => step.fields)) as field (field.key)}
						<div>
							<h2 class="font-semibold text-slate-800">{field.label}</h2>
							<p class="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{displayValue(field, valueForPreview(field, fields))}</p>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/key}

	{#if form?.message}
		<p class="mt-3 text-sm text-rose-600" role="alert">{form.message}</p>
	{/if}

	<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
		<div>
			{#if currentIndex > 0}
				<button type="button" class="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" onclick={previousStep}>
					上一步
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-3">
			{#if !isEditing}
				<button type="submit" formaction="?/save" onclick={clearDraftBeforeSubmit} class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600">
					存为草稿
				</button>
			{/if}
			{#if currentIndex < steps.length - 1}
				<button type="button" class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700" onclick={nextStep}>
					下一步
				</button>
			{:else}
				<button type="submit" formaction="?/submit" onclick={clearDraftBeforeSubmit} class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
					{isEditing ? '重新提交' : '提交申请'}
				</button>
			{/if}
		</div>
	</div>
</form>
