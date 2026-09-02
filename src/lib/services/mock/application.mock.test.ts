import { describe, it, expect } from 'vitest';
import {
  getApplications,
  createApplication,
  updateApplication,
  submitApplication,
  approveApplication,
  rejectApplication,
  cancelApplication,
  getStatistics,
  getDepartmentStatistics
} from './application.mock';

// 通用的模拟数据
const baseData = {
  applicant: { id: 'emp001', name: '张明', department: '技术研发部', email: '', employeeId: '' },
  travelInfo: {
    origin: '北京',
    destination: '上海',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    purpose: '参加技术研讨会',
    transportType: 'flight',
    estimatedCost: 3500
  }
};

describe('差旅 Mock 数据逻辑测试', () => {

  it('1. 获取列表：应该有大于 0 条数据', () => {
    const result = getApplications({ page: 1, pageSize: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.list.length).toBeGreaterThan(0);
  });

  it('2. 创建：新建申请后，状态应为草稿，且 ID 自动生成', () => {
    const newApp = createApplication(baseData);
    
    expect(newApp.id).toBeTruthy();
    expect(newApp.status).toBe('draft');
  });

  it('3. 搜索：应该能匹配到申请人姓名', () => {
    const result = getApplications({ search: '张明' });
    
    // 搜索结果里必须包含张明
    expect(result.list.some(app => app.applicant.name === '张明')).toBe(true);
  });

  it('4. 按状态筛选：应该只返回对应状态的数据', () => {
    const result = getApplications({ status: 'approved' });
    
    // 所有返回的结果都必须是 approved
    expect(result.list.every(app => app.status === 'approved')).toBe(true);
  });

  it('5. 更新：修改费用后，原数据应该被更新', () => {
    const newApp = createApplication(baseData);
    const updatedApp = updateApplication(newApp.id, {
      travelInfo: { ...newApp.travelInfo, estimatedCost: 5000 }
    });

    expect(updatedApp?.travelInfo.estimatedCost).toBe(5000);
  });

  it('6. 审批流：提交后应变成待审批，批准后应变成已批准', () => {
    const newApp = createApplication(baseData);
    
    // 提交
    const submitted = submitApplication(newApp.id);
    expect(submitted?.status).toBe('pending');
    
    // 批准
    const approved = approveApplication(newApp.id);
    expect(approved?.status).toBe('approved');
    expect(approved?.approvedAt).toBeTruthy();
  });

  it('7. 审批流：驳回时必须带驳回理由', () => {
    const newApp = createApplication(baseData);
    submitApplication(newApp.id);
    
    const rejected = rejectApplication(newApp.id, '预算不足，请调整');
    
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.rejectReason).toBe('预算不足，请调整');
  });

  it('8. 取消：草稿或待审批状态可以取消，已批准的不可取消', () => {
    const newApp = createApplication(baseData);
    
    // 提交
    submitApplication(newApp.id);
    
    // 取消
    const cancelled = cancelApplication(newApp.id);
    expect(cancelled?.status).toBe('cancelled');

    // 已批准状态无法取消
    const approvedApp = getApplications({ status: 'approved' }).list[0];
    const result = cancelApplication(approvedApp.id);
    expect(result).toBeNull();
  });

  it('9. 统计：统计结果应该包含总申请数和各状态数量', () => {
    const stats = getStatistics();
    
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.pending).toBeGreaterThanOrEqual(0);
    expect(stats.approved).toBeGreaterThanOrEqual(0);
    expect(stats.draft).toBeGreaterThanOrEqual(0);
    expect(stats.cancelled).toBeGreaterThanOrEqual(0);
    expect(stats.rejected).toBeGreaterThanOrEqual(0);
  });

  it('10. 部门统计：每个部门的总数应该大于等于批准数', () => {
    const deptStats = getDepartmentStatistics();
    
    Object.values(deptStats).forEach(dept => {
      expect(dept.total).toBeGreaterThanOrEqual(dept.approved);
    });
  });
});
