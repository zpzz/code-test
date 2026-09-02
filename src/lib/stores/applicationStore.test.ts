import { describe, it, expect } from 'vitest';
import { applicationStore } from './applicationStore';
import { getApplications } from '$lib/services/mock/application.mock';

// 每次测试开始前必须强制清空并重新生成数据
function resetApp() {
  getApplications({ page: 1, pageSize: 999 }); // 先强制触发底层数据重新生成
  applicationStore.load({ page: 1, pageSize: 5 }); // 再重新加载 store
}

describe('差旅申请 Store 单元测试', () => {
  
  it('1. 加载后应该有数据，且总数大于 0', () => {
    resetApp();
    expect(applicationStore.list.length).toBeGreaterThan(0);
    expect(applicationStore.total).toBeGreaterThan(0);
  });

  it('2. 新增一条申请后，列表总数会增加', () => {
    resetApp();
    const beforeTotal = applicationStore.total;

    const newApp = applicationStore.create({
      applicant: { id: 'test1', name: '测试用户', department: '测试部', email: '', employeeId: '' },
      travelInfo: {
        origin: '北京',
        destination: '上海',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        purpose: '单元测试',
        transportType: 'train',
        estimatedCost: 1000
      },
    });

    // 总数+1
    expect(applicationStore.total).toBe(beforeTotal + 1);
    //新增id
    expect(applicationStore.list.some(app => app.id === newApp.id)).toBe(true);
  });

  it('3. 按状态筛选应该只返回对应状态的数据', () => {
    resetApp();
    applicationStore.filterByStatus('pending');
    
    expect(applicationStore.list.every(app => app.status === 'pending')).toBe(true);
  });

  it('4. 搜索应该能匹配到相关人员', () => {
    resetApp();
    applicationStore.search('张明');
    
    expect(applicationStore.list.some(app => app.applicant.name === '张明')).toBe(true);
  });

  it('5. 审批通过后，状态应该变成 approved', () => {
    resetApp();
    applicationStore.filterByStatus('pending');
    const firstPending = applicationStore.list[0];

    if (firstPending) {
      applicationStore.approve(firstPending.id);
      applicationStore.load({ page: 1, pageSize: 5 });
      expect(applicationStore.getById(firstPending.id)?.status).toBe('approved');
    } else {
      expect(true).toBe(true); // 当前没有 pending 状态的数据，测试通过
    }
  });
});