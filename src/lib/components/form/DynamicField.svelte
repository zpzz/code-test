<script lang="ts">
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import DynamicField from './DynamicField.svelte';

	/** 所有基础输入控件共用的 Tailwind 样式。 */
	const INPUT_CLASS =
		'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

	/** 重复字段未配置 max 时的默认最大行数。 */
	const DEFAULT_REPEATABLE_MAX = 10;

	/** 重复字段添加按钮未配置文案时的默认文本。 */
	const DEFAULT_ADD_LABEL = '添加';

	/** 重复字段删除按钮的统一文案。 */
	const REMOVE_LABEL = '删除';

	/** 下拉框的空选项文案。 */
	const EMPTY_SELECT_LABEL = '请选择';

	interface Props {
		field: FieldDef;
		value: unknown;
		onChange: (value: unknown) => void;
	}

	let { field, value, onChange }: Props = $props();

	function updateObject(key: string, nextValue: unknown): void {
		onChange({ ...((value as Record<string, unknown>) ?? {}), [key]: nextValue });
	}

	function updateRepeatable(index: number, key: string, nextValue: unknown): void {
		const rows = [...((value as Array<Record<string, unknown>>) ?? [])];
		rows[index] = { ...(rows[index] ?? {}), [key]: nextValue };
		onChange(rows);
	}

	function createInitialValue(fieldDefs: FieldDef[]): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		for (const field of fieldDefs) {
			if (field.kind === 'group') {
				result[field.key] = createInitialValue(field.fields);
			} else if (field.kind === 'repeatable') {
				result[field.key] = [createInitialValue(field.itemFields)];
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

	function repeatableRows(
		currentValue: unknown,
		itemFields: FieldDef[],
		minimum = 0
	): Array<Record<string, unknown>> {
		if (Array.isArray(currentValue) && currentValue.length > 0) {
			return currentValue as Array<Record<string, unknown>>;
		}

		return minimum > 0 ? [createInitialValue(itemFields)] : [];
	}
</script>

{#if field.kind === 'group'}
	<fieldset class="rounded-lg border border-slate-200 px-5 pt-2 pb-4">
		<legend class="px-1.5 text-sm font-semibold text-slate-700">{field.label}</legend>
		<div class="space-y-4">
			{#each field.fields as child (child.key)}
				<DynamicField
					field={child}
					value={(value as Record<string, unknown> | undefined)?.[child.key]}
					onChange={(nextValue) => updateObject(child.key, nextValue)}
				/>
			{/each}
		</div>
	</fieldset>
{:else if field.kind === 'repeatable'}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-slate-700">{field.label}</h2>
			<button
				type="button"
				disabled={repeatableRows(value, field.itemFields, field.min).length >= (field.max ?? DEFAULT_REPEATABLE_MAX)}
				class="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={() => {
					const rows = repeatableRows(value, field.itemFields, field.min);
					onChange([...rows, createInitialValue(field.itemFields)]);
				}}
			>
				{field.addLabel ?? DEFAULT_ADD_LABEL}
			</button>
		</div>
		{#each repeatableRows(value, field.itemFields, field.min) as row, index (String(row[field.itemKey] ?? index))}
			<div class="rounded-lg border border-slate-200 p-4">
				<div class="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
					{#each field.itemFields as child (child.key)}
						<div class="min-w-0">
							<DynamicField
								field={child}
								value={row[child.key]}
								onChange={(nextValue) => updateRepeatable(index, child.key, nextValue)}
							/>
						</div>
					{/each}
					<button
						type="button"
						disabled={repeatableRows(value, field.itemFields, field.min).length <= (field.min ?? 0)}
						class="self-end text-sm text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
						onclick={() => {
							const rows = repeatableRows(value, field.itemFields, field.min);
							onChange(rows.filter((_, rowIndex) => rowIndex !== index));
						}}
					>
						{REMOVE_LABEL}
					</button>
				</div>
			</div>
		{/each}
	</div>
{:else if field.kind === 'radio'}
	<fieldset>
		<legend class="text-sm font-medium text-slate-800">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</legend>
		<div class="mt-2 flex flex-wrap gap-5 text-sm text-slate-700">
			{#each field.options as option (option.value)}
				<label class="inline-flex items-center gap-2">
					<input
						type="radio"
						name={field.key}
						value={option.value}
						checked={value === option.value}
						onchange={() => onChange(option.value)}
					/>
					{option.label}
				</label>
			{/each}
		</div>
	</fieldset>
{:else if field.kind === 'select'}
	<label class="block">
		<span class="text-sm font-medium text-slate-700">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</span>
		<select class="{INPUT_CLASS} mt-2" value={String(value ?? '')} onchange={(event) => onChange((event.currentTarget as HTMLSelectElement).value)}>
			<option value="">{EMPTY_SELECT_LABEL}</option>
			{#each field.options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
{:else if field.kind === 'date'}
	<label class="block">
		<span class="text-sm font-medium text-slate-700">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</span>
		<input class="{INPUT_CLASS} mt-2" type="date" value={String(value ?? '')} oninput={(event) => onChange((event.currentTarget as HTMLInputElement).value)} />
	</label>
{:else if field.kind === 'dateRange'}
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="block">
			<span class="text-sm font-medium text-slate-700">{field.label}（开始）</span>
			<input class="{INPUT_CLASS} mt-2" type="date" value={String((value as Record<string, unknown> | undefined)?.[field.fromKey] ?? '')} oninput={(event) => updateObject(field.fromKey, (event.currentTarget as HTMLInputElement).value)} />
		</label>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">{field.label}（结束）</span>
			<input class="{INPUT_CLASS} mt-2" type="date" value={String((value as Record<string, unknown> | undefined)?.[field.toKey] ?? '')} oninput={(event) => updateObject(field.toKey, (event.currentTarget as HTMLInputElement).value)} />
		</label>
	</div>
{:else if field.kind === 'number'}
	<label class="block">
		<span class="text-sm font-medium text-slate-700">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</span>
		<input class="{INPUT_CLASS} mt-2" type="number" min={field.min ?? 0} step="0.01" value={String(value ?? 0)} onchange={(event) => onChange(Number((event.currentTarget as HTMLInputElement).value) || 0)} />
		{#if field.hint}<p class="mt-1 text-xs text-slate-400">{field.hint}</p>{/if}
	</label>
{:else if field.kind === 'textarea'}
	<label class="block">
		<span class="text-sm font-medium text-slate-700">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</span>
		<textarea class="{INPUT_CLASS} mt-2 min-h-28 resize-y" rows="4" maxlength={field.maxLength} placeholder={field.placeholder} value={String(value ?? '')} oninput={(event) => onChange((event.currentTarget as HTMLTextAreaElement).value)}></textarea>
		{#if field.hint}<p class="mt-1 text-xs text-slate-400">{field.hint}</p>{/if}
	</label>
{:else if field.kind === 'text'}
	<label class="block">
		<span class="text-sm font-medium text-slate-700">
			{field.label}{#if field.required}<span class="text-red-500"> *</span>{/if}
		</span>
		<input class="{INPUT_CLASS} mt-2" value={String(value ?? '')} maxlength={field.maxLength} placeholder={field.placeholder} oninput={(event) => onChange((event.currentTarget as HTMLInputElement).value)} />
	</label>
{/if}
