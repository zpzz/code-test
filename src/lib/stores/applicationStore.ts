import type { TravelApplication, ApplicationStatus } from '$lib/types/application';
import {
  getApplications,
  getApplicationById,
  createApplication,
  submitApplication,
  approveApplication,
  rejectApplication,
  cancelApplication
} from '$lib/services/mock/application.mock';

export class ApplicationStore {
  list: TravelApplication[] = [];
  total: number = 0;
  filters: {
    status?: ApplicationStatus;
    search?: string;
    page: number;
    pageSize: number;
  } = { page: 1, pageSize: 5 };

  // 加载数据
  load = (filters?: { status?: ApplicationStatus; search?: string; page?: number; pageSize?: number }) => {
    const merged = { ...this.filters, ...filters };
    const result = getApplications(merged);
    console.info("🚀 ~ ApplicationStore ~ result:", result)
    this.list = result.list;
    this.total = result.total;
    this.filters = merged;
  };

  // 创建
  create = (data: any) => {
    const newApp = createApplication(data);
    this.filters = { ...this.filters, page: 1 }; // 强制回到第一页
    this.load();
    return newApp;
  };

  // 提交
  submit = (id: string) => {
    submitApplication(id);
    this.load();
  };

  // 审批
  approve = (id: string) => {
    approveApplication(id);
    this.load();
  };

  // 驳回
  reject = (id: string, reason: string) => {
    rejectApplication(id, reason);
    this.load();
  };

  // 取消
  cancel = (id: string) => {
    cancelApplication(id);
    this.load();
  };

  // 查找单个
  getById = (id: string) => {
    return getApplicationById(id);
  };

  // 筛选 / 搜索
  filterByStatus = (status?: ApplicationStatus) => {
    this.filters = { ...this.filters, status, page: 1 };
    this.load();
  };

  search = (keyword: string) => {
    this.filters = { ...this.filters, search: keyword, page: 1 };
    this.load();
  };

  changePage = (page: number) => {
    this.filters = { ...this.filters, page };
    this.load();
  };
}

// 单例导出
export const applicationStore = new ApplicationStore();