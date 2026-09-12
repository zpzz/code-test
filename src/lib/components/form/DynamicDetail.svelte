<script lang="ts">
	import { enumService } from '$lib/enums';
	import { centsToYuan, formatAmount } from '$lib/utils';
	import type { FieldDef } from '$lib/domain/applicationTypes';
	import DynamicDetail from './DynamicDetail.svelte';

	interface Props {
		field: FieldDef;
		value: unknown;
	}

	let { field, value }: Props = $props();

	function textValue(currentValue: unknown): string {
		return String(currentValue ?? '').trim() || '-';
	}

	function displayValue(field: FieldDef, currentValue: unknown): string {
		if (field.kind === 'select' || field.kind === 'radio') {
			const enumKey =
				field.key === 'leaveType' ? 'leaveType' : field.key === 'transport' ? 'transport' : 'urgency';
			return enumService.label(enumKey, String(currentValue ?? ''));
		}

		if (field.kind === 'number') {
			return field.money
				? formatAmount(centsToYuan(Number(currentValue) || 0))
				: textValue(currentValue);
		}

		if (field.kind === 'dateRange') {
			const range = (currentValue as Record<string, unknown> | undefined) ?? {};
			return `${textValue(range[field.fromKey])} 至 ${textValue(range[field.toKey])}`;
		}

		return textValue(currentValue);
	}

	function valueForChild(child: FieldDef, row: Record<string, unknown>): unknown {
		if (child.kind === 'dateRange') {
			return row[child.key] ?? {
				[child.fromKey]: row[child.fromKey],
				[child.toKey]: row[child.toKey]
			};
		}

		return row[child.key];
	}
</script>

{#if field.kind === 'group'}
	<div class="grid gap-x-12 gap-y-4 sm:grid-cols-2">
		{#each field.fields as child (child.key)}
			<DynamicDetail field={child} value={(value as Record<string, unknown> | undefined)?.[child.key]} />
		{/each}
	</div>
{:else if field.kind === 'repeatable'}
	<div class="space-y-3">
		{#if Array.isArray(value) && value.length > 0}
			{#each value as row, index (String((row as Record<string, unknown>)[field.itemKey] ?? index))}
				<div class="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
					<p class="mb-3 text-xs font-semibold text-slate-500">第 {index + 1} 段</p>
					<div class="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each field.itemFields as child (child.key)}
							<DynamicDetail
								field={child}
								value={valueForChild(child, row as Record<string, unknown>)}
							/>
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			<p class="text-sm text-slate-400">暂无数据</p>
		{/if}
	</div>
{:else}
	<div>
		<p class="text-xs text-slate-500">{field.label}</p>
		<p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900">
			{displayValue(field, value)}
		</p>
	</div>
{/if}
