<script lang="ts">
    import { onMount } from 'svelte';
    import StatusBadge from '$lib/components/common/StatusBadge.svelte';
    import { applicationStore } from '$lib/stores/applicationStore';
    import type { ApplicationStatus } from '$lib/types/application';

    // 使用 $state 手动保存数据
    let apps = $state<any[]>([]);
    let total = $state(0);
    let currentPage = $state(1);
    let pageSize = $state(5);
    let selectedStatus = $state<ApplicationStatus | ''>('');
    let searchKeyword = $state('');

    // 强制刷新数据的方法
    function refreshList() {
        apps = applicationStore.list;
        total = applicationStore.total;
        currentPage = applicationStore.filters.page;
    }

    // 初始化
    onMount(() => {
        applicationStore.load({ page: 1, pageSize: 5 });
        refreshList();
    });

    // 新增：删除申请
    function handleDelete(appId: string) {
        if (confirm(`确定要删除申请 ${appId} 吗？此操作不可恢复。`)) {
            // 调用 Store 的取消或删除逻辑
            applicationStore.cancel(appId);
            refreshList();
            alert('申请已删除！');
        }
    }

    // 计算总页数
    const totalPages = $derived(Math.ceil(total / pageSize));

    const paginationItems = $derived.by(() => {
        const delta = 1;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                range.push(i);
            }
        }
        range.forEach((i) => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });
        return rangeWithDots;
    });

    // 状态选项
    const statusOptions: { value: ApplicationStatus | ''; label: string }[] = [
      { value: '', label: '全部' },
      { value: 'draft', label: '草稿' },
      { value: 'pending', label: '待审批' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已拒绝' },
      { value: 'cancelled', label: '已取消' }
    ];

    // 筛选和搜索
    function handleStatusChange(event: Event) {
      const select = event.target as HTMLSelectElement;
      const value = select.value as ApplicationStatus | '';
      selectedStatus = value;
      applicationStore.filterByStatus(value || undefined);
      refreshList();
    }
  
    function handleSearch() {
      applicationStore.search(searchKeyword);
      refreshList();
    }
  
    function handleSearchKeyup(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        handleSearch();
      }
    }
  
    function goToPage(page: number) {
      if (page < 1 || page > totalPages || page === currentPage) return;
      applicationStore.changePage(page);
      refreshList();
    }
  
    function formatDate(dateStr: string): string {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  
    function formatCurrency(amount: number): string {
      return '¥' + amount.toLocaleString();
    }
</script>

<!-- ================== HTML 模板部分 ================== -->
<div class="space-y-6 p-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">📋 申请列表</h1>
      <p class="text-gray-500 mt-1">共 {total} 条申请记录</p>
    </div>
  
    <!-- 筛选和搜索 -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <select
          bind:value={selectedStatus}
          on:change={handleStatusChange}
          class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      <div class="flex-1 flex gap-2">
        <input
          type="text"
          bind:value={searchKeyword}
          on:keyup={handleSearchKeyup}
          placeholder="搜索申请人、目的地、部门..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          on:click={handleSearch}
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          搜索
        </button>
      </div>
    </div>
  
    <!-- 申请列表 -->
    {#if apps.length === 0}
      <div class="bg-white rounded-xl shadow-sm p-12 text-center">
        <div class="text-6xl mb-4">📭</div>
        <h3 class="text-lg font-medium text-gray-900">暂无申请</h3>
        <p class="text-gray-500 mt-1">点击 "发起申请" 创建第一条申请</p>
      </div>
    {:else}
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请编号</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请人</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">目的地</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">费用</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">提交时间</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each apps as app}
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">{app.id}</td>
                  <td class="px-6 py-4">
                    <div>
                      <div class="text-sm font-medium text-gray-900">{app.applicant.name}</div>
                      <div class="text-xs text-gray-500">{app.applicant.department}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">{app.travelInfo.destination}</td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(app.travelInfo.estimatedCost)}</td>
                  <td class="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {app.submittedAt ? formatDate(app.submittedAt) : '-'}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex gap-2">
                      <!-- 查看详情 -->
                      <a
                        href="/detail/{app.id}"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看详情 →
                      </a>
                      
                      <!-- 修改按钮：只有批准状态下禁用，其他都可点 -->
                      {#if app.status !== 'approved'}
                        <a
                          href="/create?edit={app.id}"
                          class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          修改
                        </a>
                      {:else}
                        <span 
                          class="text-gray-300 text-sm font-medium cursor-not-allowed" 
                          title="已批准的申请不可修改"
                        >
                          修改
                        </span>
                      {/if}

                      <!-- 删除按钮 -->
                      <button
                        on:click={() => handleDelete(app.id)}
                        class="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
  
      <!-- 完整分页组件 -->
      {#if totalPages > 1}
        <div class="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          <div class="text-sm text-gray-500">
            共 <span class="font-medium text-gray-900">{total}</span> 条，第 <span class="font-medium text-gray-900">{currentPage}</span>/{totalPages} 页
          </div>
          
          <div class="flex items-center gap-1">
            <!-- 上一页 -->
            <button
              on:click={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              上一页
            </button>

            <!-- 页码（包含省略号） -->
            {#each paginationItems as item}
              {#if item === '...'}
                <span class="px-2 text-gray-500">...</span>
              {:else}
                <button
                  on:click={() => goToPage(item)}
                  class={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm transition-colors ${
                    currentPage === item 
                    ? 'bg-blue-600 text-white border-blue-600 font-medium' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item}
                </button>
              {/if}
            {/each}

            <!-- 下一页 -->
            <button
              on:click={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      {/if}
    {/if}
</div>