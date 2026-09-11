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
		type ApplicationType,
		type FieldDef
	} from '$lib/domain/applicationTypes';
	import { stepHref, stepsOf } from '$lib/domain/wizard';
	import { centsToYuan, formatAmount, getEnumLabel } from '$lib/utils';
	import type { PageData } from './$types';

	type FormValue = Record<string, unknown>;

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

	function createInitialFields(fieldDefs: FieldDef[]): FormValue {
		const result: FormValue = {};
		for (const field of fieldDefs) {
			if (field.kind === 'group') {
				result[field.key] = createInitialFields(field.fields);
			} else if (field.kind === 'repeatable') {
				result[field.key] = [createInitialFields(field.itemFields)];
			} else if (field.kind === 'radio') {
				result[field.key] = field.options[0]?.value ?? '';
			} else if (field.kind === 'number') {
				result[field.key] = 0;
			} else if (field.kind === 'dateRange') {
				result[field.key] = { [field.fromKey]: '', [field.toKey]: '' };
			} else {
				result[field.key] = '';
			}
		}
		return result;
	}

	function toFormFields(fieldDefs: FieldDef[], source: FormValue): FormValue {
		const result: FormValue = {};
		for (const field of fieldDefs) {
			const value = source[field.key];
			if (field.kind === 'group') {
				result[field.key] = toFormFields(field.fields, (value as FormValue) ?? {});
			} else if (field.kind === 'repeatable') {
				const rows = (Array.isArray(value) ? value : []).map((row) =>
					toFormFields(field.itemFields, row as FormValue)
				);
				result[field.key] =
					rows.length > 0 || !field.min ? rows : [createInitialFields(field.itemFields)];
			} else if (field.kind === 'dateRange') {
				const range = (value as FormValue | undefined) ?? {};
				result[field.key] = {
					[field.fromKey]: range[field.fromKey] ?? source[field.fromKey] ?? '',
					[field.toKey]: range[field.toKey] ?? source[field.toKey] ?? ''
				};
			} else if (field.kind === 'number' && field.money) {
				result[field.key] = centsToYuan(Number(value) || 0);
			} else {
				result[field.key] = value ?? (field.kind === 'number' ? 0 : '');
			}
		}
		return result;
	}

	function mergeInitialFields(fieldDefs: FieldDef[], source: FormValue): FormValue {
		const result: FormValue = {};

		for (const field of fieldDefs) {
			const value = source[field.key];
			if (field.kind === 'group') {
				result[field.key] = mergeInitialFields(field.fields, (value as FormValue) ?? {});
			} else if (field.kind === 'repeatable') {
				const rows = Array.isArray(value)
					? value.map((row) => mergeInitialFields(field.itemFields, row as FormValue))
					: [];
				result[field.key] =
					rows.length > 0 || !field.min ? rows : [createInitialFields(field.itemFields)];
			} else if (field.kind === 'dateRange') {
				const range = (value as FormValue | undefined) ?? {};
				result[field.key] = {
					[field.fromKey]: range[field.fromKey] ?? source[field.fromKey] ?? '',
					[field.toKey]: range[field.toKey] ?? source[field.toKey] ?? ''
				};
			} else {
				result[field.key] = value ?? (field.kind === 'number' ? 0 : field.kind === 'radio' ? field.options[0]?.value ?? '' : '');
			}
		}

		return result;
	}

	function persistFields(nextFields: FormValue): void {
		const formKey = loadedFormKey ?? `${type}:new`;
		fields = nextFields;
		wizardDraft.set({ key: formKey, fields: nextFields });
		if (browser) {
			sessionStorage.setItem(`application-wizard:${formKey}`, JSON.stringify(nextFields));
		}
	}

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

	function valueForPreview(field: FieldDef, source: Record<string, unknown>): unknown {
		if (field.kind === 'dateRange') {
			return source[field.key] ?? {
				[field.fromKey]: source[field.fromKey],
				[field.toKey]: source[field.toKey]
			};
		}
		return source[field.key];
	}

	function flattenPreviewFields(fieldDefs: FieldDef[]): FieldDef[] {
		return fieldDefs.flatMap((field) => {
			if (field.kind === 'group') return flattenPreviewFields(field.fields);
			return [field];
		});
	}

	function fieldLabel(field: FieldDef): string {
		return field.label;
	}

	function displayValue(field: FieldDef, value: unknown): string {
		if (field.kind === 'select' || field.kind === 'radio') {
			return getEnumLabel(field.options, String(value ?? ''));
		}
		if (field.kind === 'number') {
			return field.money ? formatAmount(centsToYuan(Number(value) || 0)) : String(value ?? '-');
		}
		if (field.kind === 'dateRange') {
			const range = (value as Record<string, unknown> | undefined) ?? {};
			return `${range[field.fromKey] || '-'} 至 ${range[field.toKey] || '-'}`;
		}
		if (field.kind === 'repeatable') {
			const rows = Array.isArray(value) ? value : [];
			return rows
				.map((row, index) => {
					const item = row as Record<string, unknown>;
					const parts = field.itemFields
						.filter((child) => child.kind !== 'repeatable' && child.kind !== 'group')
						.map((child) => `${child.label}: ${displayValue(child, item[child.key])}`);
					return `${index + 1}. ${parts.join('，')}`;
				})
				.join('\n');
		}
		return String(value ?? '').trim() || '-';
	}

	function validateField(field: FieldDef, value: unknown): boolean {
		if (field.kind === 'group') {
			return field.fields.every((child) => validateField(child, (value as FormValue | undefined)?.[child.key]));
		}
		if (field.kind === 'repeatable') {
			const rows = Array.isArray(value) ? value : [];
			return rows.length >= (field.min ?? 0) && rows.length <= (field.max ?? 10) &&
				rows.every((row) => field.itemFields.every((child) => validateField(child, (row as FormValue)[child.key])));
		}
		if (field.kind === 'dateRange') {
			const range = (value as FormValue | undefined) ?? {};
			if (field.required && (!range[field.fromKey] || !range[field.toKey])) return false;
			return (
				!range[field.fromKey] ||
				!range[field.toKey] ||
				String(range[field.toKey]) >= String(range[field.fromKey])
			);
		}
		if (field.required && (value === undefined || value === null || String(value).trim() === '')) return false;
		if (field.kind === 'text' || field.kind === 'textarea') {
			if (typeof value === 'string' && field.minLength && value.trim().length < field.minLength) return false;
			if (typeof value === 'string' && field.maxLength && value.trim().length > field.maxLength) return false;
		}
		return true;
	}

	function isStepComplete(index: number): boolean {
		// 未到达的步骤不能因为默认值或预览类型而显示为已完成。
		if (index > currentIndex) return false;

		const step = steps[index];
		if (step.kind === 'preview') return index < currentIndex;
		return step.fields.every((field) => validateField(field, fields[field.key]));
	}

	function isReachable(index: number): boolean {
		return index <= currentIndex || Array.from({ length: index }, (_, item) => isStepComplete(item)).every(Boolean);
	}

	async function goToStep(index: number): Promise<void> {
		if (!isReachable(index)) return;
		await goto(stepHref(type, steps[index].slug, page.url.searchParams.get('edit')), {
			keepFocus: true,
			noScroll: true
		});
	}

	function nextStep(): void {
		attempted = true;
		if (!isStepComplete(currentIndex)) return;
		attempted = false;
		if (currentIndex < steps.length - 1) goToStep(currentIndex + 1);
	}

	function previousStep(): void {
		attempted = false;
		if (currentIndex > 0) goToStep(currentIndex - 1);
	}

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
							<h2 class="font-semibold text-slate-800">{fieldLabel(field)}</h2>
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
