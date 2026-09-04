import { describe, it, expect } from 'vitest';
import { prisma } from '../../server/db';

describe('SQLite 数据库连接与数据读取测试', () => {

  it('1. 应该能成功连接数据库并读取到申请数据', async () => {
    // 从数据库读取所有申请
    const applications = await prisma.application.findMany();
    
    // 断言：数据量应该大于 0
    expect(applications.length).toBeGreaterThan(0);
  });

  it('2. 申请数据里应该包含差旅（travel）类型的数据', async () => {
    const travelApps = await prisma.application.findMany({
      where: { type: 'travel' }
    });

    expect(travelApps.length).toBeGreaterThan(0);
  });

  it('3. 应该能读取到多级审批状态（pending_manager 或 pending_finance）', async () => {
    // 查找处于审批中的申请
    const pendingApps = await prisma.application.findMany({
      where: { 
        status: { in: ['pending_manager', 'pending_finance'] }
      }
    });

    expect(pendingApps.length).toBeGreaterThan(0);
  });

  it('4. 应该能读取到审批日志（AuditLog）', async () => {
    // 获取前 5 条申请，并连带查询它们的审批记录
    const appsWithAudit = await prisma.application.findMany({
      take: 5,
      include: { auditLogs: true }
    });

    // 检查是否有申请关联了审批日志
    const hasAuditLogs = appsWithAudit.some(app => app.auditLogs.length > 0);
    expect(hasAuditLogs).toBe(true);
  });

  it('5. JSON 字符串字段应该能被解析', async () => {
    const apps = await prisma.application.findMany();
    
    // 遍历第一条数据，验证 fields 字段是否是以 JSON 字符串形式存储
    if (apps.length > 0) {
      const fields = JSON.parse(apps[0].fields);
      expect(fields).toBeTruthy();
    }
  });
});