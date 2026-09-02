import { nanoid } from 'nanoid';
import type { TravelApplication, ApplicationStatus, Applicant, DepartmentStat } from '$lib/types/application';

// 当前登录用户
export const currentUser: Applicant = {
  id: 'emp001',
  name: '张明',
  department: '技术研发部',
  email: 'zhangming@company.com',
  employeeId: 'EMP001'
};

// 所有部门
export const departments = ['技术研发部', '市场营销部', '销售部', '人力资源部', '财务部', '运营部'];

// 用户列表（用于选择申请人）
export const users: Applicant[] = [
  currentUser,
  { id: 'emp002', name: '李娜', department: '市场营销部', email: 'lina@company.com', employeeId: 'EMP002' },
  { id: 'emp003', name: '王磊', department: '销售部', email: 'wanglei@company.com', employeeId: 'EMP003' },
  { id: 'emp004', name: '陈静', department: '人力资源部', email: 'chenjing@company.com', employeeId: 'EMP004' },
  { id: 'emp005', name: '刘洋', department: '财务部', email: 'liuyang@company.com', employeeId: 'EMP005' },
  { id: 'emp006', name: '赵敏', department: '运营部', email: 'zhaomin@company.com', employeeId: 'EMP006' },
];

// 生成 60 条丰富数据的函数
function generateMockData(): TravelApplication[] {
  const data: TravelApplication[] = [];
  const statuses: ApplicationStatus[] = ['approved', 'pending', 'rejected', 'draft', 'cancelled'];
  const origins = ['北京', '上海', '广州', '深圳']; // 出发地
  const destinations = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆'];
  const purposes = [
    '参加行业技术交流会', '拜访重要客户洽谈合作', '参加年度产品发布会', 
    '进行项目实地调研', '参加招聘宣讲会', '处理跨部门协同工作', 
    '参加季度销售复盘会议', '进行供应商实地考察'
  ];
  const transportTypes = ['flight', 'train', 'car'];

  for (let i = 1; i <= 60; i++) {
    const user = users[i % users.length];
    const status = statuses[i % statuses.length];
    const submittedDate = new Date();
    submittedDate.setDate(submittedDate.getDate() - i * 3); // 随时间递减
    // 确保出发地和目的地不相同
    const origin = origins[i % origins.length];
    let destination = destinations[i % destinations.length];
    if (destination === origin) {
      destination = destinations[(i + 1) % destinations.length];
    }
    
    const app: TravelApplication = {
      id: `APP-2026-${String(i).padStart(3, '0')}`,
      applicant: user,
      travelInfo: {
        origin: origin,
        destination: destination,
        startDate: new Date(submittedDate.getTime() + 86400000 * 2).toISOString().split('T')[0],
        endDate: new Date(submittedDate.getTime() + 86400000 * 4).toISOString().split('T')[0],
        purpose: purposes[i % purposes.length],
        transportType: transportTypes[i % transportTypes.length] as any,
        estimatedCost: Math.floor(Math.random() * 6000) + 800 // 800 - 6800
      },
      status: status,
      createdAt: submittedDate.toISOString(),
      updatedAt: submittedDate.toISOString(),
    };

    if (status === 'pending') {
      app.submittedAt = new Date(submittedDate.getTime() + 3600000).toISOString();
    } else if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
      app.submittedAt = new Date(submittedDate.getTime() + 3600000).toISOString();
      if (status === 'approved') {
        app.approvedAt = new Date(submittedDate.getTime() + 86400000).toISOString();
        app.comments = '流程合规，同意出差。';
      } else if (status === 'rejected') {
        app.rejectReason = '出差预算超支，建议减少出差天数或调整交通方式。';
      }
    }

    data.push(app);
  }

  // 初始的 5 条固定数据
  const initialApps: TravelApplication[] = [
    {
      id: 'APP-001',
      applicant: users[0],
      travelInfo: {
        origin: '北京',
        destination: '上海',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        purpose: '参加技术研讨会，交流最新技术趋势',
        transportType: 'flight',
        estimatedCost: 3500
      },
      status: 'approved',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-02T14:30:00Z',
      submittedAt: '2026-09-01T10:30:00Z',
      approvedAt: '2026-09-02T14:30:00Z',
      comments: '审批通过，请按时参加并做好记录'
    },
    {
      id: 'APP-002',
      applicant: users[1],
      travelInfo: {
        origin: '北京',
        destination: '上海',
        startDate: '2026-09-15',
        endDate: '2026-09-18',
        purpose: '拜访重要客户，洽谈年度合作事宜',
        transportType: 'train',
        estimatedCost: 2800
      },
      status: 'pending',
      createdAt: '2026-09-03T09:00:00Z',
      updatedAt: '2026-09-03T09:00:00Z',
      submittedAt: '2026-09-03T09:15:00Z',
    },
    {
      id: 'APP-003',
      applicant: users[2],
      travelInfo: {
        origin: '北京',
        destination: '深圳',
        startDate: '2026-09-20',
        endDate: '2026-09-22',
        purpose: '与合作伙伴进行项目洽谈',
        transportType: 'flight',
        estimatedCost: 4200
      },
      status: 'rejected',
      createdAt: '2026-08-28T16:00:00Z',
      updatedAt: '2026-08-29T11:00:00Z',
      submittedAt: '2026-08-28T16:20:00Z',
      rejectReason: '预算不足，请重新规划行程或选择更经济的交通方式'
    },
    {
      id: 'APP-004',
      applicant: users[3],
      travelInfo: {
        origin: '北京',
        destination: '杭州',
        startDate: '2026-09-25',
        endDate: '2026-09-26',
        purpose: '参加校招面试，选拔优秀人才',
        transportType: 'train',
        estimatedCost: 1200
      },
      status: 'draft',
      createdAt: '2026-09-04T08:00:00Z',
      updatedAt: '2026-09-04T08:00:00Z',
    },
    {
      id: 'APP-005',
      applicant: users[4],
      travelInfo: {
        origin: '北京',
        destination: '成都',
        startDate: '2026-09-05',
        endDate: '2026-09-08',
        purpose: '参加行业展会，开拓市场渠道',
        transportType: 'flight',
        estimatedCost: 3800
      },
      status: 'cancelled',
      createdAt: '2026-08-20T14:00:00Z',
      updatedAt: '2026-08-25T09:00:00Z',
      submittedAt: '2026-08-20T14:30:00Z',
    }
  ];

  // 将生成的60条放在前面，初始5条放在最后，保证时间倒序
  return [...data, ...initialApps];
}

// 初始 Mock 数据（60条 + 5条，每次模块加载都会重新生成，保证刷新不丢失！）
let applications: TravelApplication[] = generateMockData();

// 挂载到 window 防止热更新意外丢失
if (typeof window !== 'undefined') {
  (window as any).__mockApplications = applications;
}

// ==================== API 函数 ====================

// 获取所有申请
export const getApplications = (params?: {
  status?: ApplicationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) => {
  let result = [...applications];

  if (params?.status) {
    result = result.filter(app => app.status === params.status);
  }

  if (params?.search) {
    const keyword = params.search.toLowerCase();
    result = result.filter(app =>
      app.applicant.name.toLowerCase().includes(keyword) ||
      app.travelInfo.destination.includes(keyword) ||
      app.travelInfo.origin.includes(keyword) ||  // 新增：支持按出发地搜索
      app.applicant.department.includes(keyword)
    );
  }

  // 按创建时间倒序
  result.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = result.length;

  // 分页
  if (params?.page && params?.pageSize) {
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    result = result.slice(start, end);
  }

  return { list: result, total };
};

// 获取单个申请
export const getApplicationById = (id: string): TravelApplication | undefined => {
  return applications.find(app => app.id === id);
};

// 创建申请
export const createApplication = (data: Omit<TravelApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>): TravelApplication => {
  const newApp: TravelApplication = {
    ...data,
    id: `APP-${nanoid(8).toUpperCase()}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  applications = [newApp, ...applications];
  if (typeof window !== 'undefined') {
    (window as any).__mockApplications = applications;
  }
  return newApp;
};

// 修改申请
export const updateApplication = (id: string, data: Partial<TravelApplication>): TravelApplication | null => {
  const index = applications.findIndex(app => app.id === id);
  if (index === -1) return null;

  const updated = {
    ...applications[index],
    ...data,
    updatedAt: new Date().toISOString()
  };

  applications[index] = updated;
  return updated;
};

// 提交申请
export const submitApplication = (id: string): TravelApplication | null => {
  const index = applications.findIndex(app => app.id === id);
  if (index === -1) return null;

  const app = applications[index];
  if (app.status !== 'draft') return null;

  const updated = {
    ...app,
    status: 'pending' as ApplicationStatus,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  applications[index] = updated;
  if (typeof window !== 'undefined') {
    (window as any).__mockApplications = applications;
  }
  return updated;
};

// 审批通过
export const approveApplication = (id: string): TravelApplication | null => {
  const index = applications.findIndex(app => app.id === id);
  if (index === -1) return null;

  const app = applications[index];
  if (app.status !== 'pending') return null;

  const updated = {
    ...app,
    status: 'approved' as ApplicationStatus,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  applications[index] = updated;
  if (typeof window !== 'undefined') {
    (window as any).__mockApplications = applications;
  }
  return updated;
};

// 审批拒绝
export const rejectApplication = (id: string, reason: string): TravelApplication | null => {
  const index = applications.findIndex(app => app.id === id);
  if (index === -1) return null;

  const app = applications[index];
  if (app.status !== 'pending') return null;

  const updated = {
    ...app,
    status: 'rejected' as ApplicationStatus,
    rejectReason: reason,
    updatedAt: new Date().toISOString()
  };

  applications[index] = updated;
  if (typeof window !== 'undefined') {
    (window as any).__mockApplications = applications;
  }
  return updated;
};

// 取消申请
export const cancelApplication = (id: string): TravelApplication | null => {
  const index = applications.findIndex(app => app.id === id);
  if (index === -1) return null;

  const app = applications[index];
  if (!['draft', 'pending'].includes(app.status)) return null;

  const updated = {
    ...app,
    status: 'cancelled' as ApplicationStatus,
    updatedAt: new Date().toISOString()
  };

  applications[index] = updated;
  if (typeof window !== 'undefined') {
    (window as any).__mockApplications = applications;
  }
  return updated;
};

// 获取统计数据
export const getStatistics = () => {
  const apps = applications;

  const statusCounts = apps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  const totalCost = apps
    .filter(app => app.status === 'approved')
    .reduce((sum, app) => sum + app.travelInfo.estimatedCost, 0);

  const monthlyMap: Record<string, { count: number; cost: number }> = {};
  apps
    .filter(app => app.status === 'approved' && app.submittedAt)
    .forEach(app => {
      const month = app.submittedAt!.substring(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { count: 0, cost: 0 };
      }
      monthlyMap[month].count += 1;
      monthlyMap[month].cost += app.travelInfo.estimatedCost;
    });

  const monthlyTrend = Object.keys(monthlyMap)
    .sort()
    .map(month => ({
      month,
      count: monthlyMap[month].count,
      cost: monthlyMap[month].cost
    }));

  return {
    total: apps.length,
    pending: statusCounts.pending || 0,
    approved: statusCounts.approved || 0,
    rejected: statusCounts.rejected || 0,
    draft: statusCounts.draft || 0,
    cancelled: statusCounts.cancelled || 0,
    totalCost,
    monthlyTrend
  };
};

// 获取部门统计
export const getDepartmentStatistics = () => {
  const deptMap: Record<string, DepartmentStat> = {};

  applications.forEach(app => {
    const dept = app.applicant.department;
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, approved: 0, pending: 0, rejected: 0 };
    }
    deptMap[dept].total += 1;
    if (app.status === 'approved') deptMap[dept].approved += 1;
    if (app.status === 'pending') deptMap[dept].pending += 1;
    if (app.status === 'rejected') deptMap[dept].rejected += 1;
  });

  return deptMap;
};