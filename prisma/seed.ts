import { PrismaClient } from '@prisma/client';
import seedData from './seed.json';

const prisma = new PrismaClient();

// 定义死 ID
const LI_JINGLI_ID = '0841d235-b926-4a41-aecd-3c5de814bd68'; // 李经理
const FINANCE_ID = 'f1a2c3e4-5b6d-4f8a-9c0b-1d2e3f4a5b6c'; // 王会计

// 标准用户列表（⚠️ 注意顺序：先插入经理和会计，再插入普通员工！）
const USERS = [
  // 1. 先创建没有上级的领导
  { id: LI_JINGLI_ID, employeeId: 'EMP10001', name: '李经理', title: '研发部主管', department: '研发部', role: 'manager', managerId: null, email: 'limanager@company.com' },
  { id: FINANCE_ID, employeeId: 'EMP20001', name: '王会计', title: '财务专员', department: '财务部', role: 'finance', managerId: null, email: 'wangaccountant@company.com' },
  
  // 2. 再创建有上级的普通员工
  { id: 'e61fe483-3b09-4e05-b4fe-dde3bc2a8694', employeeId: 'EMP10086', name: '张三', title: '软件工程师', department: '研发部', role: 'employee', managerId: LI_JINGLI_ID, email: 'zhangsan@company.com' },
  { id: '5170a4c5-20dc-4d18-91a9-95ba9786e3f0', employeeId: 'EMP10087', name: '王芳', title: '高级软件工程师', department: '研发部', role: 'employee', managerId: LI_JINGLI_ID, email: 'wangfang@company.com' },
  { id: '0fc31634-c8ac-482a-8b95-4df36fdbf571', employeeId: 'EMP10088', name: '刘洋', title: '测试工程师', department: '研发部', role: 'employee', managerId: LI_JINGLI_ID, email: 'liuyang@company.com' },
  { id: 'ba778d9f-8224-4de3-bbaa-05ca9cbcc679', employeeId: 'EMP10089', name: '陈静', title: '产品经理', department: '研发部', role: 'employee', managerId: LI_JINGLI_ID, email: 'chenjing@company.com' }
];

async function main() {
  console.log('🚀 开始导入种子数据...');

  // 1. 导入用户表（顺序已经调整好，不会报外键错误）
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user
    });
  }
  console.log(`✅ 成功导入 ${USERS.length} 位用户。`);

  // 2. 过滤差旅数据
  const travelData = (seedData as any[]).filter((app: any) => app.type === 'travel');
  
  // 3. 录入申请单（同时关联用户表）
  for (const app of travelData) {
    await prisma.application.create({
      data: {
        id: app.id,
        type: app.type,
        applicantId: app.applicantId,
        applicantName: app.applicantName,
        department: app.department,
        status: app.status,
        fields: JSON.stringify(app.fields),
        createdAt: new Date(app.createdAt),
        updatedAt: new Date(app.updatedAt),
        submittedAt: app.submittedAt ? new Date(app.submittedAt) : null,

        auditLogs: {
          create: app.audit.map((a: any) => ({
            id: a.id,
            at: new Date(a.at),
            actorId: a.actorId,
            actorName: a.actorName,
            action: a.action,
            fromStatus: a.from,
            toStatus: a.to,
            comment: a.comment
          }))
        }
      }
    });
  }

  console.log('✅ 种子数据导入成功！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });