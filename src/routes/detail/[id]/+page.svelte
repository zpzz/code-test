<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { applicationStore } from '$lib/stores/applicationStore';
    import StatusBadge from '$lib/components/common/StatusBadge.svelte';
    import type { TravelApplication } from '$lib/types/application';

    // 1. 读取路由参数
    let appId = $derived($page.params.id || '');

    // 2. 设置初始状态为空，等数据加载
    let app = $state<TravelApplication | undefined>(undefined);

    // 3. 核心响应式逻辑：强制加载底层真实数据并查找！
    $effect(() => {
        if (appId) {
            // 触发 Store 加载底层所有真实数据（解决找不到 ID 的 Bug）
            applicationStore.load();
            // 根据真实的 ID 去查
            app = applicationStore.getById(appId);
        }
    });

    // 审批操作
    let showRejectModal = $state(false);
    let rejectReason = $state('');
    let isProcessing = $state(false);

    function handleSubmit() {
        isProcessing = true;
        setTimeout(() => {
            applicationStore.submit(appId);
            isProcessing = false;
            app = applicationStore.getById(appId); // 操作后立刻重新获取真实数据
        }, 500);
    }

    function handleApprove() {
        isProcessing = true;
        setTimeout(() => {
            applicationStore.approve(appId);
            isProcessing = false;
            app = applicationStore.getById(appId);
        }, 500);
    }

    function handleReject() {
        if (!rejectReason.trim()) {
            alert('驳回理由不能为空！');
            return;
        }
        isProcessing = true;
        setTimeout(() => {
            applicationStore.reject(appId, rejectReason.trim());
            isProcessing = false;
            showRejectModal = false;
            app = applicationStore.getById(appId);
        }, 500);
    }

    function formatDate(dateStr?: string) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('zh-CN');
    }
</script>

<div class="min-h-screen bg-gray-100 py-10 px-4">
    <div class="max-w-4xl mx-auto">
        
        <!-- 顶部导航 -->
        <div class="flex items-center justify-between mb-6">
            <button 
                on:click={() => goto('/')}
                class="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
            >
                ← 返回申请列表
            </button>
            <h1 class="text-2xl font-bold text-gray-800">申请详情</h1>
            <div class="w-24"></div>
        </div>

        {#if !app}
            <div class="bg-white rounded-xl p-12 text-center text-gray-500">
                未找到该申请，可能已被删除或链接ID错误。
            </div>
        {:else}
            <!-- 主内容卡片 -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                
                <!-- 状态和标题区域 -->
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-white">{app.id}</h2>
                        <p class="text-blue-100 text-sm mt-1">创建于 {formatDate(app.createdAt)}</p>
                    </div>
                    <StatusBadge status={app.status} />
                </div>

                <!-- 驳回理由高亮 -->
                {#if app.status === 'rejected' && app.rejectReason}
                    <div class="mx-8 mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <p class="text-red-800 font-medium">🔴 驳回理由</p>
                        <p class="text-red-700 text-sm mt-1">{app.rejectReason}</p>
                    </div>
                {/if}

                <!-- 信息主体 -->
                <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- 左侧：基础信息 -->
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">申请人信息</h3>
                            <div class="flex items-center gap-4">
                                <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                                    {app.applicant.name.charAt(0)}
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900">{app.applicant.name}</p>
                                    <p class="text-sm text-gray-500">{app.applicant.department}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">差旅行程</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">出发时间</span>
                                    <span class="font-medium text-gray-900">{formatDate(app.travelInfo.startDate)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">结束时间</span>
                                    <span class="font-medium text-gray-900">{formatDate(app.travelInfo.endDate)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">交通方式</span>
                                    <span class="font-medium text-gray-900">
                                        {#if app.travelInfo.transportType === 'flight'}✈️ 飞机
                                        {:else if app.travelInfo.transportType === 'train'}🚄 高铁
                                        {:else}🚗 其他{/if}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">预计费用</span>
                                    <span class="font-medium text-blue-600">¥{app.travelInfo.estimatedCost.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧：申请事由和历史 -->
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">申请事由</h3>
                            <div class="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm leading-relaxed">
                                {app.travelInfo.purpose || '无'}
                            </div>
                        </div>

                        <div>
                            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">审批信息</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">提交时间</span>
                                    <span class="text-gray-900 text-sm">{formatDate(app.submittedAt)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">审批时间</span>
                                    <span class="text-gray-900 text-sm">{formatDate(app.approvedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 底部操作区（核心） -->
                <div class="bg-gray-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-4">
                    
                    <!-- 草稿：可以提交 -->
                    {#if app.status === 'draft'}
                        <button 
                            on:click={() => goto(`/create?edit=${app.id}`)}
                            class="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            编辑
                        </button>
                        <button 
                            on:click={handleSubmit}
                            disabled={isProcessing}
                            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {isProcessing ? '提交中...' : '🚀 提交审批'}
                        </button>

                    <!-- 待审批：审批人操作 -->
                    {:else if app.status === 'pending'}
                        <button 
                            on:click={() => showRejectModal = true}
                            disabled={isProcessing}
                            class="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
                        >
                            ❌ 驳回
                        </button>
                        <button 
                            on:click={handleApprove}
                            disabled={isProcessing}
                            class="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                        >
                            ✅ 批准
                        </button>

                    {:else}
                        <!-- 其他状态：无操作 -->
                        <span class="text-gray-500 text-sm py-2">该申请已结束，不可执行操作</span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- 驳回理由模态框 -->
{#if showRejectModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 class="text-lg font-bold text-gray-900 mb-4">❌ 驳回申请</h3>
            <p class="text-sm text-gray-600 mb-4">请输入驳回理由，该理由将展示给申请人。</p>
            
            <textarea 
                bind:value={rejectReason}
                rows="4"
                placeholder="请输入驳回理由（必填）..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none bg-gray-50"
            ></textarea>

            <div class="flex justify-end gap-3 mt-6">
                <button 
                    on:click={() => showRejectModal = false}
                    class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                    取消
                </button>
                <button 
                    on:click={handleReject}
                    disabled={isProcessing}
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                    {isProcessing ? '提交中...' : '确认驳回'}
                </button>
            </div>
        </div>
    </div>
{/if}