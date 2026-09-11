<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { init, use, type ComposeOption, type ECharts } from 'echarts/core';
	import { CanvasRenderer } from 'echarts/renderers';
	import { PieChart, LineChart, type PieSeriesOption, type LineSeriesOption } from 'echarts/charts';
	import {
		GridComponent,
		TooltipComponent,
		LegendComponent,
		type GridComponentOption,
		type TooltipComponentOption,
		type LegendComponentOption
	} from 'echarts/components';
	import { LabelLayout } from 'echarts/features';

	// 按需注册：只打包用到的图表与组件，避免 `import * as echarts from 'echarts'` 全量引入。
	// 新增图表时在此处追加对应 Chart / Component 即可（如 BarChart + DatasetComponent）。
	use([
		CanvasRenderer,
		PieChart,
		LineChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		LabelLayout
	]);

	/** 本组件支持的 option 类型（运行时仅注册饼图 + 折线图 + 上述组件） */
	export type EChartOption = ComposeOption<
		| PieSeriesOption
		| LineSeriesOption
		| GridComponentOption
		| TooltipComponentOption
		| LegendComponentOption
	>;

	interface Props {
		/** echarts 配置项；变化时自动 setOption(notMerge) 重绘 */
		option: EChartOption;
		/** 容器高度，默认 320px */
		height?: string;
		/** 初始化完成后回调，传递 ECharts 实例供父组件注册事件 */
		onReady?: (chart: ECharts) => void;
		/** 实例销毁前回调，供父组件解绑事件监听 */
		onDispose?: (chart: ECharts) => void;
	}

	let { option, height = '320px', onReady, onDispose }: Props = $props();

	let container = $state<HTMLDivElement>();
	let chart = $state<ECharts | null>(null);
	let observer: ResizeObserver | null = null;
	/** option 变更 debounce 计时器 */
	let renderTimer: ReturnType<typeof setTimeout> | null = null;

	// option 变化即重绘（防抖 60ms，避免快速连续变更时多次 setOption）
	$effect(() => {
		if (!chart) return;
		const nextOption = option;
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			chart?.setOption(nextOption, true);
		}, 60);
	});

	onMount(() => {
		if (!browser) return;
		chart = init(container!);
		chart.setOption(option, true);
		observer = new ResizeObserver(() => chart?.resize());
		observer.observe(container!);
		onReady?.(chart);
	});

	onDestroy(() => {
		if (renderTimer) clearTimeout(renderTimer);
		renderTimer = null;
		observer?.disconnect();
		if (chart) {
			onDispose?.(chart);
			chart.dispose();
		}
		chart = null;
	});
</script>

<div bind:this={container} class="chart" style="height: {height}"></div>

<style>
	.chart {
		width: 100%;
	}
</style>
