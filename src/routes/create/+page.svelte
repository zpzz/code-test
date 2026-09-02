<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { applicationStore } from '$lib/stores/applicationStore';
    import { currentUser } from '$lib/services/mock/application.mock';
    import type { Applicant, ApplicationStatus } from '$lib/types/application';

    let editId = $derived($page.url.searchParams.get('edit') || '');
    let isEditMode = $derived(editId !== '');

    let loggedInUser = $state<Applicant>(currentUser);

    $effect(() => {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                loggedInUser = JSON.parse(stored);
            } else {
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } catch (e) {
            // 忽略错误
        }
    });

    // 表单数据（新增 origin）
    let applicantName = $state('');
    let department = $state('');
    let origin = $state('');
    let destination = $state('');
    let startDate = $state('');
    let endDate = $state('');
    let transportType = $state('train');
    let estimatedCost = $state<number | ''>('');
    let reason = $state('');
    
    let isSubmitting = $state(false);
    let errorMessage = $state('');

    $effect(() => {
        if (isEditMode && editId) {
            const existing = applicationStore.getById(editId);
            if (existing) {
                applicantName = existing.applicant.name;
                department = existing.applicant.department;
                origin = existing.travelInfo.origin || '';
                destination = existing.travelInfo.destination;
                startDate = existing.travelInfo.startDate || '';
                endDate = existing.travelInfo.endDate || '';
                transportType = existing.travelInfo.transportType || 'train';
                estimatedCost = existing.travelInfo.estimatedCost;
                reason = existing.travelInfo.purpose || '';
            } else {
                errorMessage = '未找到对应的申请，可能已被删除。';
            }
        } else {
            applicantName = loggedInUser.name;
            department = loggedInUser.department;
        }
    });

    async function handleSubmit(action: 'draft' | 'submit') {
        errorMessage = '';
        if (!origin.trim() || !destination.trim() || !startDate || !endDate || !transportType || !estimatedCost || !reason.trim()) {
            errorMessage = '请填写所有带 * 号的必填项！';
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            errorMessage = '结束日期不能早于出发日期！';
            return;
        }

        isSubmitting = true;

        const payload = {
            applicant: { 
                id: loggedInUser.id, 
                name: applicantName.trim(), 
                department: department.trim() 
            },
            travelInfo: {
                origin: origin.trim(),
                destination: destination.trim(),
                startDate: startDate,
                endDate: endDate,
                transportType: transportType,
                estimatedCost: Number(estimatedCost),
                purpose: reason.trim(),
            },
            status: action === 'draft' ? 'draft' : 'pending'
        };

        await new Promise(resolve => setTimeout(resolve, 500));

        if (isEditMode) {
            applicationStore.update(editId, {
                travelInfo: payload.travelInfo,
                status: action === 'draft' ? 'draft' : 'pending'
            });
            if (action === 'submit') {
                applicationStore.submit(editId);
            }
        } else {
            const newApp = applicationStore.create(payload);
            if (action === 'submit') {
                applicationStore.submit(newApp.id);
            }
        }

        isSubmitting = false;
        goto('/');
    }
</script>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
            <h1 class="text-2xl font-bold text-white flex items-center gap-2">
                {#if isEditMode}
                    ✏️ 修改差旅申请
                {:else}
                    ✈️ 发起差旅申请
                {/if}
            </h1>
            <p class="text-blue-100 mt-2 text-sm">
                {#if isEditMode}
                    正在编辑申请 {editId}，请更新相关信息。
                {:else}
                    请填写以下信息，提交后将进入审批流程。
                {/if}
            </p>
        </div>

        <form class="p-8 space-y-6">
            
            <div>
                <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">基础信息</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700 mb-1.5">
                            申请人姓名 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="name" 
                            type="text" 
                            bind:value={applicantName}
                            disabled
                            class="w-full px-4 py-2.5 border border-gray-200 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed focus:outline-none"
                        />
                    </div>
                    <div>
                        <label for="department" class="block text-sm font-medium text-gray-700 mb-1.5">
                            所属部门 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="department" 
                            type="text" 
                            bind:value={department}
                            disabled
                            class="w-full px-4 py-2.5 border border-gray-200 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            <div>
                <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">差旅行程详情</h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label for="origin" class="block text-sm font-medium text-gray-700 mb-1.5">
                            出发地 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="origin" 
                            type="text" 
                            bind:value={origin}
                            placeholder="例如：北京"
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white"
                        >
                    </div>
                    <div>
                        <label for="destination" class="block text-sm font-medium text-gray-700 mb-1.5">
                            出差目的地 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="destination" 
                            type="text" 
                            bind:value={destination}
                            placeholder="例如：上海"
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white"
                        >
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label for="transportType" class="block text-sm font-medium text-gray-700 mb-1.5">
                            交通方式 <span class="text-red-500">*</span>
                        </label>
                        <select
                            id="transportType"
                            bind:value={transportType}
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white cursor-pointer"
                        >
                            <option value="train">🚄 高铁/火车</option>
                            <option value="flight">✈️ 飞机</option>
                            <option value="car">🚗 自驾/汽车</option>
                        </select>
                    </div>
                    <div>
                        <label for="cost" class="block text-sm font-medium text-gray-700 mb-1.5">
                            预计费用 (¥) <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="cost" 
                            type="number" 
                            bind:value={estimatedCost}
                            placeholder="例如：3000"
                            min="0"
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white"
                        >
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1.5">
                            出发时间 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="startDate" 
                            type="date" 
                            bind:value={startDate}
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white"
                        >
                    </div>
                    <div>
                        <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1.5">
                            结束时间 <span class="text-red-500">*</span>
                        </label>
                        <input 
                            id="endDate" 
                            type="date" 
                            bind:value={endDate}
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white"
                        >
                    </div>
                </div>

                <div>
                    <label for="reason" class="block text-sm font-medium text-gray-700 mb-1.5">
                        出差事由 <span class="text-red-500">*</span>
                    </label>
                    <textarea 
                        id="reason" 
                        bind:value={reason}
                        rows="4"
                        placeholder="请简要描述出差目的和具体工作安排..."
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 hover:bg-white focus:bg-white resize-none"
                    ></textarea>
                </div>
            </div>

            {#if errorMessage}
                <div class="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    {errorMessage}
                </div>
            {/if}

            <div class="flex items-center justify-between pt-6 border-t border-gray-100">
                <a href="/" class="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                    取消
                </a>
                
                <div class="flex gap-3">
                    <button 
                        type="button" 
                        on:click={() => handleSubmit('draft')}
                        disabled={isSubmitting}
                        class="px-6 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? '处理中...' : '保存草稿'}
                    </button>
                    
                    <button 
                        type="button" 
                        on:click={() => handleSubmit('submit')}
                        disabled={isSubmitting}
                        class="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '处理中...' : '提交审批'}
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>