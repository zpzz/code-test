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

## ✅ 已修复的问题

### 1. 补充单元测试和 E2E 测试

- 为审批状态机、审批权限、审批状态流转补充测试。
- 为申请表单校验和字段规范化方法补充边界测试，包括：
  - 事由长度校验。
  - 行程必填项、日期先后关系和出发地/目的地校验。
  - 预算合计和预算说明校验。
  - 不同角色提交后的下一审批状态。
- 为申请创建、申请详情、申请撤销、申请驳回、批量审批、申请类型切换等核心流程补充 E2E 测试。
- 组件层覆盖了 `Table`、`Pagination`、`EChart`、动态字段和动态详情展示。
- 服务端业务测试通过 mock 数据库注入，避免核心单元测试依赖真实开发数据库。

相关目录：

```text
src/lib/vitest/
e2e/
```

### 2. 支持动态表单和多个申请类型

- 发起申请路由调整为：

```text
/create/[type]/[step]
```

- 申请类型和步骤由 `APPLICATION_TYPES` 配置驱动，不再把四个步骤和差旅字段写死在页面中。
- 当前支持：
  - 差旅申请：基本信息、行程明细、费用预算、预览确认。
  - 请假申请：基本信息、请假时间、预览确认。
- 左侧申请类型可以在差旅申请和请假申请之间切换，并默认跳转到对应的我的申请列表。
- 我的申请、待我审批、统计报表和申请详情会根据申请类型动态展示字段和数据。
- 动态表单支持文本框、文本域、单选框、下拉框、日期、日期范围、分组字段和可重复行程字段。

主要实现：

```text
src/lib/domain/applicationTypes.ts
src/lib/components/form/DynamicField.svelte
src/lib/components/form/DynamicDetail.svelte
src/routes/create/[type]/[step]/
```

### 3. 提取表格组件常量

- 将表格默认分页大小、分页选项、最小页数和默认空状态文案提取为组件内部常量。
- `Table` 通过 `dataSource` 和 `columns` 接收数据和列配置。
- 支持泛型列类型、`render`、`href`、自定义单元格、自定义表头和分页配置。
- 我的申请、待我审批和统计报表共用同一套表格组件，减少重复实现。

主要实现：

```text
src/lib/components/common/Table.svelte
src/lib/components/common/Pagination.svelte
```

### 4. 修复东八区时间显示问题

- 统一服务端保存和前端展示的时间策略，避免直接使用 UTC 分量导致东八区时间少 8 小时。
- 日期格式化集中到公共日期工具中，申请日期、提交时间和审批记录使用统一格式。
- 申请创建、审批流转、撤销和审批日志使用统一的本地时间生成逻辑。
- 年份、月份筛选按统一时间规则处理，避免跨月或跨日时出现筛选结果偏差。

主要实现：

```text
src/lib/format/date.ts
src/lib/server/application-service.ts
src/lib/server/approval-service.ts
```

### 5. 删除遗留代码和死代码

- 清理旧版布局组件、未使用的旧类型定义和未调用的工具方法。
- 删除旧路由和已经被动态申请类型替代的差旅专用逻辑。
- 移除调试用 `console.info` 和无实际功能的旧逻辑。
- 删除重复的日期、金额和申请字段转换代码，统一复用公共工具。
- 保留当前 Svelte 5 Runes 和 SvelteKit 文件路由实现，避免新旧实现同时维护。

### 6. 新增共享审批服务层

- 将审批通过、驳回、批量通过和撤销逻辑统一收敛到共享服务层。
- 服务层统一处理：
  - 当前用户和申请是否存在。
  - 角色权限校验。
  - 直属经理关系校验。
  - 当前申请状态校验。
  - 审批状态流转。
  - 驳回理由校验。
  - 审批日志写入。
- 批量审批使用 Prisma transaction，确保多条申请要么全部成功，要么全部回滚。
- 页面 action 只负责解析表单参数和转换错误，不再重复实现审批业务规则。

主要实现：

```text
src/lib/server/approval-service.ts
src/lib/domain/approval.ts
src/routes/approvals/+page.server.ts
src/routes/requests/[id]/+page.server.ts
```

这样审批列表和申请详情页面使用同一套审批规则，避免两个页面的状态机逻辑发生偏差。



![待我审批](/static/assets/待我审批.png)

![发起申请](/static/assets/发起申请.png)

![统计报表](/static//assets/统计报表.png)

![我的申请](/static/assets/我的申请.png)

![详情页面](/static/assets/详情页面.png)
