<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		actions?: Snippet;
		children: Snippet;
		class?: string;
		contentClass?: string;
	}

	let {
		title = undefined,
		actions = undefined,
		children,
		class: className = '',
		contentClass = ''
	}: Props = $props();
</script>

<section class="overflow-hidden rounded-lg border border-slate-200 bg-white {className}">
	{#if title || actions}
		<header class="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
			{#if title}
				<h2 class="mr-auto text-sm font-semibold text-slate-800">{title}</h2>
			{/if}

			{#if actions}
				<div class="flex items-center gap-2">
					{@render actions()}
				</div>
			{/if}
		</header>
	{/if}

	<div class={contentClass}>
		{@render children()}
	</div>
</section>
