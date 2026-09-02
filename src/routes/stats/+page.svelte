<script lang="ts">
    import { onMount } from 'svelte';
    import { getStatistics, getDepartmentStatistics } from '$lib/services/mock/application.mock';
    import type { ApplicationStats, DepartmentStat } from '$lib/types/application';
    import EChart from '$lib/components/common/EChart.svelte';
    import type { EChartsOption } from 'echarts';

    let stats = $state<ApplicationStats | null>(null);
    let deptStats = $state<Record<string, DepartmentStat> | null>(null);

    // 图表配置
    let pieOption = $state<EChartsOption>({});
    let barOption = $state<EChartsOption>({});

    onMount(() => {
        stats = getStatistics();
        deptStats = getDepartmentStatistics();

        // 饼图配置（申请状态分布）
        pieOption = {
            tooltip: { trigger: 'item' },
            legend: { bottom: '0%', left: 'center' },
            series: [
                {
                    name: '申请状态',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 20,
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: { show: false },
                    data: [
                        { value: stats.draft, name: '草稿', itemStyle: { color: '#9CA3AF' } },
                        { value: stats.pending, name: '待审批', itemStyle: { color: '#F59E0B' } },
                        { value: stats.approved, name: '已批准', itemStyle: { color: '#10B981' } },
                        { value: stats.rejected, name: '已驳回', itemStyle: { color: '#EF4444' } },
                        { value: stats.cancelled, name: '已取消', itemStyle: { color: '#60A5FA' } }
                    ]
                }
            ]
        };

        // 柱状图配置（各部门申请情况）
        const deptArray = deptStats ? Object.entries(deptStats).map(([name, data]) => ({ name, ...data })) : [];
        barOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: ['总申请', '已批准', '待审批', '已驳回'],
                top: '0%'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: deptArray.map(d => d.name)
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: '总申请',
                    type: 'bar',
                    data: deptArray.map(d => d.total),
                    itemStyle: { color: '#3B82F6' }
                },
                {
                    name: '已批准',
                    type: 'bar',
                    data: deptArray.map(d => d.approved),
                    itemStyle: { color: '#10B981' }
                },
                {
                    name: '待审批',
                    type: 'bar',
                    data: deptArray.map(d => d.pending),
                    itemStyle: { color: '#F59E0B' }
                },
                {
                    name: '已驳回',
                    type: 'bar',
                    data: deptArray.map(d => d.rejected),
                    itemStyle: { color: '#EF4444' }
                }
            ]
        };
    });

    // 格式化货币
    function formatCurrency(amount: number) {
        return '¥' + amount.toLocaleString();
    }
</script>

<div class="min-h-screen bg-gray-100 py-10 px-4">
    <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- 标题 -->
        <div>
            <h1 class="text-3xl font-bold text-gray-900">📊 统计报表</h1>
            <p class="text-gray-500 mt-2">差旅申请数据总览与部门分布</p>
        </div>

        {#if !stats}
            <div class="text-center py-20 text-gray-500">数据加载中...</div>
        {:else}
            <!-- 顶部总览卡片 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">总申请数</p>
                    <p class="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">待审批</p>
                    <p class="text-3xl font-bold text-orange-500 mt-2">{stats.pending}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">已批准</p>
                    <p class="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p class="text-sm text-gray-500">已批准总费用</p>
                    <p class="text-3xl font-bold text-indigo-600 mt-2">{formatCurrency(stats.totalCost)}</p>
                </div>
            </div>

            <!-- 图表区 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <!-- 左：状态分布（ECharts 饼图） -->
                <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">申请状态分布</h2>
                    <EChart option={pieOption} height="400px" />
                </div>

                <!-- 右：部门统计（ECharts 柱状图） -->
                <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 class="text-lg font-bold text-gray-800 mb-4">各部门申请情况</h2>
                    <EChart option={barOption} height="400px" />
                </div>

            </div>
        {/if}
    </div>
</div>