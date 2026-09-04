# ✈️ 差旅申请管理系统

基于 **SvelteKit + Svelte 5 (Runes) + Tailwind CSS v4 + SQLite (Prisma)** 的差旅申请管理系统。


---
node version：22

## 🚀 启动方式

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库
npx prisma migrate dev

# 3. 导入种子数据
pnpm db:seed

# 4. 启动开发服务器
pnpm dev

# 5.重置数据库
npx prisma migrate reset --force
```

## 📁 项目目录结构

```text
src/
├── routes/                      # 页面路由与后端逻辑
│   ├── +layout.svelte           # 全局布局、菜单、用户切换
│   ├── +layout.server.ts        # 全局用户数据查询
│   ├── request/                 # 我的申请
│   ├── create/                  # 发起申请
│   ├── approvals/               # 待我审批
│   ├── detail/[id]/             # 申请详情
│   └── stats/                   # 统计报表
│
├── lib/
│   ├── components/              # 公共组件
│   │   ├── common/              # DataTable、PageHeader 等
│   │   └── layout/              # 布局组件
│   │
│   ├── server/                  # 服务端专属代码
│   │   └── db.ts                # Prisma 客户端
│   │
│   ├── stores/                  # 全局状态
│   │   └── user.ts              # 当前用户状态
│   │
│   ├── enums/                   # 枚举服务
│   ├── utils/                   # 工具函数
│   ├── types/                   # 类型定义
│   └── styles/                  # 全局样式
│
├── prisma/                      # 数据库
│   ├── schema.prisma            # 数据模型
│   └── seed.ts                  # 种子数据
│
└── static/                      # 静态资源
```

## 🔄 审批流程与状态流转

### 审批流程（按角色视角）
- **员工**：自己 ➔ 经理 ➔ 财务
- **经理**：自己 ➔ 财务
- **财务**：自己 ➔ 经理 ➔ 财务
- 注：自己不能审批自己的差旅单

---

### 完整流转状态

| 状态代码 | 状态名称 | 描述 |
| :--- | :--- | :--- |
| `draft` | 草稿 | 已保存，未提交审批。 |
| `pending_manager` | 待主管审批 | 已提交，等待经理审批。 |
| `pending_finance` | 待财务审批 | 经理已通过，等待财务审批。 |
| `approved` | 已通过 | 财务已通过，流程结束。 |
| `rejected` | 已驳回 | 任意审批环节未通过。 |
| `cancelled` | 已撤销 | 申请人主动取消申请。 |

---

### 状态流转逻辑

1. **草稿（draft）**
   - ➔ **待主管审批**：提交申请。

2. **待主管审批（pending_manager）**
   - ➔ **已撤销**：申请人自己取消。
   - ➔ **已驳回**：经理审批不通过。
   - ➔ **待财务审批**：经理审批通过。

3. **待财务审批（pending_finance）**
   - ➔ **已撤销**：申请人自己取消。
   - ➔ **已驳回**：财务审批不通过。
   - ➔ **已通过**：财务审批通过。

4. **已通过（approved）**
   - 流程结束，不可再变更。

5. **已驳回（rejected）**
   - 流程结束，不可再变更。

6. **已撤销（cancelled）**
   - 流程结束，不可再变更。

   

## 🔧 优化部分

- **卡片公共组件抽取**：将统计卡片抽成公共组件，支持传参复用。
- **公共主题色抽取**：将硬编码颜色提取为 Tailwind 全局主题变量，方便统一修改。
- **EChart 封装**：图表已抽成公共 `EChart.svelte` 组件，支持传入配置自适应。
- **业务表格组件封装**：规划抽取为传入 `columns` 和 `dataSource` 的通用表格组件。
- **枚举工厂类实现**：抽象枚举类（可拓展，支持后端枚举获取，融合前后端枚举）。