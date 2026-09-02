// 文件路径: src/lib/stores/dataStore.svelte.ts
import type { ApplicationStatus } from '$lib/types/application';

// 定义申请的类型（根据你现有列表页的字段）
export interface Application {
    id: string;
    applicant: { name: string; department: string };
    travelInfo: { destination: string; estimatedCost: number };
    status: ApplicationStatus;
    submittedAt: string;
}

// 初始数据（复用你列表页的 18 条数据逻辑）
const initialData: Application[] = [
    // ... 把列表页生成的 18 条数据贴在这里，或者保留原来的 store 逻辑
];

export const applicationStore = $state({
    list: initialData,
    add: (application: Application) => {
        applicationStore.list.unshift(application);
    }
});