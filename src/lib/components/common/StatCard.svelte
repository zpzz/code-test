<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		valueClass?: string;
		class?: string;
	}

	let {
		label,
		value,
		valueClass = 'text-slate-900',
		class: className = ''
	}: Props = $props();
</script>

<div class="rounded-lg border border-slate-200 bg-white px-5 py-4 {className}">
	<p class="text-sm text-slate-500">{label}</p>
	<p class="mt-1 text-3xl leading-tight font-semibold {valueClass}">{value}</p>
</div>
