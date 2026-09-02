<script lang="ts">
    import * as echarts from 'echarts';
    import { onMount, onDestroy } from 'svelte';
    import type { EChartsOption } from 'echarts';

    // 接收外部传入的图表配置
    let { option, height = '400px' }: { option: EChartsOption; height?: string } = $props();

    let chartContainer: HTMLDivElement;
    let chartInstance: echarts.ECharts | null = null;

    onMount(() => {
        if (chartContainer) {
            chartInstance = echarts.init(chartContainer);
            chartInstance.setOption(option);
        }

        // 监听窗口大小变化，自适应
        const resizeObserver = new ResizeObserver(() => {
            chartInstance?.resize();
        });
        if (chartContainer) {
            resizeObserver.observe(chartContainer);
        }

        return () => {
            resizeObserver.disconnect();
            chartInstance?.dispose();
            chartInstance = null;
        };
    });

    // 当 option 改变时，更新图表
    $effect(() => {
        if (chartInstance && option) {
            chartInstance.setOption(option, true); // true 表示不合并，直接替换
        }
    });
</script>

<div class="w-full" bind:this={chartContainer} style={`height: ${height};`}></div>