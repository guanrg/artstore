# 026.artstore 系统使用说明书（Medusa + Storefront + Strapi + CRM）

## 1. 文档目的
本手册用于指导你在本项目中完成以下工作：

- 本地环境初始化与启动（PowerShell）
- 日常开发与联调
- 管理后台和内容后台的使用
- CRM（Lead/Opportunity）功能使用
- 数据库实体关系（ER）理解
- 常见故障排查

---

## 2. 系统总览

### 2.1 技术栈
- 后端电商核心：Medusa v2.13.1（Node.js + TypeScript）
- 前端商城：Next.js（`apps/storefront`）
- CMS：Strapi（`apps/strapi`）
- 数据库：PostgreSQL
- 缓存/队列：Redis

### 2.2 Monorepo 结构
- `apps/medusa`：订单、商品、购物车、客户、CRM 等服务
- `apps/storefront`：前台站点
- `apps/strapi`：CMS 内容管理
- `docker-compose.yml`：Postgres/Redis 基础设施

### 2.3 本地默认端口
- Storefront：`http://localhost:3000`
- Strapi：admin `http://localhost:1337`
- Medusa：admin `http://localhost:9000/app`
- Medusa API：`http://localhost:9000`

---

## 3. 环境准备（PowerShell）

## 3.1 依赖要求
- Node.js 20+
- npm 10+
- Docker Desktop

## 3.2 安装依赖
```powershell
cd D:\work\project\026.artstore\www
npm install
npm --prefix apps/storefront install
```

## 3.3 启动基础设施
```powershell
cd D:\work\project\026.artstore\www
npm run infra:up
```

## 3.4 一键启动全部服务
```powershell
cd D:\work\project\026.artstore\www
npm run dev:all
```

如果需要清理后重启：
```powershell
cd D:\work\project\026.artstore\www
npm run dev:all:clean
```

---

## 4. 分服务启动（PowerShell）

## 4.1 Medusa
```powershell
cd D:\work\project\026.artstore\www
npm run dev:medusa
```

## 4.2 Strapi
```powershell
cd D:\work\project\026.artstore\www
npm run dev:strapi
```

## 4.3 Storefront
```powershell
cd D:\work\project\026.artstore\www
npm run dev:storefront
```

---

## 5. 首次初始化与账号

## 5.1 Medusa 管理员
```powershell
cd D:\work\project\026.artstore\www\apps\medusa
npx medusa user -e admin2@local.dev -p Admin123456
```

登录地址：`http://localhost:9000/app`

## 5.2 Publishable Key（供 Storefront）
```powershell
cd D:\work\project\026.artstore\www\apps\medusa
npx medusa exec ./src/scripts/create-publishable-key.ts
```
然后把 key 配到 `apps/storefront/.env.local` 的 `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`。

## 5.3 CRM 模块迁移（首次）
```powershell
cd D:\work\project\026.artstore\www\apps\medusa
npx medusa db:generate crm
npx medusa db:migrate
```

---

## 6. 核心业务流程

## 6.1 电商主流程
1. 用户浏览商品（Storefront）。
2. 加入购物车并结算。
3. Medusa 处理订单、库存、支付与客户。
4. 管理员在 Medusa Admin 查看订单。

## 6.2 内容流程（Strapi）
1. 运营在 Strapi 创建/维护内容。
2. Storefront 拉取内容并渲染展示。

## 6.3 CRM 流程（已接入）
1. 创建 Lead（潜在客户）。
2. 跟进 Lead 状态：`new/contacted/qualified/lost`。
3. 将 Lead 转化为 Opportunity（商机）。
4. Opportunity 阶段流转：`prospecting/negotiation/closed_won/closed_lost`。

---

## 7. CRM 功能说明

## 7.1 数据模型

### Lead
- `id`
- `name`
- `email`
- `company`
- `source`
- `status`（`new | contacted | qualified | lost`）
- `customer_id`（可选）

### Opportunity
- `id`
- `name`
- `estimated_amount`
- `customer_id`
- `stage`（`prospecting | negotiation | closed_won | closed_lost`）
- `expected_close_date`（可选）
- `lead_id`（可选）

### 与 Customer 的关系
CRM 使用 Medusa v2 的 **Module Link** 与原生 Customer 建立关联（而非跨模块强耦合外键）。

### Task（任务）
- `id`
- `title`
- `description`（可选）
- `type`（`todo | call | email | meeting | follow_up`）
- `status`（`open | in_progress | completed | canceled`）
- `priority`（`low | medium | high | urgent`）
- `due_date`（可选）
- `completed_at`（可选）
- `owner_id`（可选）
- `customer_id`（可选）

### TaskRelation（任务关联）
- `id`
- `task_id`
- `target_type`（如：`lead`、`opportunity`、`customer`、以及你自定义对象类型）
- `target_id`
- `relationship`（默认 `related`）

说明：通过 `TaskRelation` 实现 Salesforce 风格的“Task 关联任意对象”。

---

## 8. CRM API 使用（PowerShell）

以下示例用于本地联调。若你的 Admin API 已启用鉴权，请在请求头加 Bearer Token。

## 8.1 创建 Lead
接口：`POST /admin/crm/leads`

```powershell
$body = @{
  name = "Alice Zhang"
  email = "alice@example.com"
  company = "Acme Pty Ltd"
  source = "website"
  status = "new"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:9000/admin/crm/leads" `
  -ContentType "application/json" `
  -Body $body
```

## 8.2 查询 Lead 列表
接口：`GET /admin/crm/leads`

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/crm/leads"
```

## 8.3 Lead 转 Opportunity
接口：`POST /admin/crm/leads/{lead_id}/convert`

```powershell
$leadId = "lead_xxx"

$body = @{
  name = "Acme 2026 Annual Contract"
  estimated_amount = 120000
  customer_id = "cus_xxx"
  stage = "prospecting"
  expected_close_date = "2026-06-30"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:9000/admin/crm/leads/$leadId/convert" `
  -ContentType "application/json" `
  -Body $body
```

## 8.4 Lead 单条查询
接口：`GET /admin/crm/leads/{lead_id}`

```powershell
$leadId = "lead_xxx"
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/crm/leads/$leadId"
```

## 8.5 Lead 更新
接口：`PATCH /admin/crm/leads/{lead_id}`

```powershell
$leadId = "lead_xxx"
$body = @{
  status = "contacted"
  source = "expo-2026"
} | ConvertTo-Json

Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:9000/admin/crm/leads/$leadId" `
  -ContentType "application/json" `
  -Body $body
```

## 8.6 Lead 删除
接口：`DELETE /admin/crm/leads/{lead_id}`

```powershell
$leadId = "lead_xxx"
Invoke-RestMethod -Method Delete -Uri "http://localhost:9000/admin/crm/leads/$leadId"
```

## 8.7 Opportunity 列表（支持分页/筛选）
接口：`GET /admin/crm/opportunities`

```powershell
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:9000/admin/crm/opportunities?limit=20&offset=0&stage=prospecting"
```

## 8.8 Opportunity 创建
接口：`POST /admin/crm/opportunities`

```powershell
$body = @{
  name = "Acme Expansion Plan"
  estimated_amount = 98000
  customer_id = "cus_xxx"
  stage = "prospecting"
  expected_close_date = "2026-08-15"
  lead_id = "lead_xxx"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:9000/admin/crm/opportunities" `
  -ContentType "application/json" `
  -Body $body
```

## 8.9 Opportunity 单条查询
接口：`GET /admin/crm/opportunities/{opportunity_id}`

```powershell
$opportunityId = "opp_xxx"
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/crm/opportunities/$opportunityId"
```

## 8.10 Opportunity 更新
接口：`PATCH /admin/crm/opportunities/{opportunity_id}`

```powershell
$opportunityId = "opp_xxx"
$body = @{
  stage = "negotiation"
  estimated_amount = 120000
} | ConvertTo-Json

Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:9000/admin/crm/opportunities/$opportunityId" `
  -ContentType "application/json" `
  -Body $body
```

## 8.11 Opportunity 删除
接口：`DELETE /admin/crm/opportunities/{opportunity_id}`

```powershell
$opportunityId = "opp_xxx"
Invoke-RestMethod -Method Delete -Uri "http://localhost:9000/admin/crm/opportunities/$opportunityId"
```

## 8.12 Task 列表（支持分页/按对象筛选）
接口：`GET /admin/crm/tasks`

```powershell
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:9000/admin/crm/tasks?limit=20&offset=0&status=open"
```

按任意对象筛选（例如某个 lead 关联的任务）：
```powershell
Invoke-RestMethod -Method Get `
  -Uri "http://localhost:9000/admin/crm/tasks?target_type=lead&target_id=lead_xxx&limit=20&offset=0"
```

## 8.13 Task 创建（可一次绑定多个对象）
接口：`POST /admin/crm/tasks`

```powershell
$body = @{
  title = "Follow up quote"
  type = "call"
  status = "open"
  priority = "high"
  due_date = "2026-04-01T10:00:00Z"
  customer_id = "cus_xxx"
  relations = @(
    @{ target_type = "lead"; target_id = "lead_xxx"; relationship = "primary" },
    @{ target_type = "opportunity"; target_id = "opp_xxx"; relationship = "related" }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:9000/admin/crm/tasks" `
  -ContentType "application/json" `
  -Body $body
```

## 8.14 Task 单条查询
接口：`GET /admin/crm/tasks/{task_id}`

```powershell
$taskId = "task_xxx"
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/crm/tasks/$taskId"
```

## 8.15 Task 更新
接口：`PATCH /admin/crm/tasks/{task_id}`

```powershell
$taskId = "task_xxx"
$body = @{
  status = "in_progress"
  priority = "urgent"
} | ConvertTo-Json

Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:9000/admin/crm/tasks/$taskId" `
  -ContentType "application/json" `
  -Body $body
```

## 8.16 Task 删除
接口：`DELETE /admin/crm/tasks/{task_id}`

```powershell
$taskId = "task_xxx"
Invoke-RestMethod -Method Delete -Uri "http://localhost:9000/admin/crm/tasks/$taskId"
```

## 8.17 Task 关联对象管理
查询任务关联：
```powershell
$taskId = "task_xxx"
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/crm/tasks/$taskId/relations"
```

新增任务关联：
```powershell
$taskId = "task_xxx"
$body = @{
  relations = @(
    @{ target_type = "lead"; target_id = "lead_xxx"; relationship = "related" },
    @{ target_type = "customer"; target_id = "cus_xxx"; relationship = "stakeholder" }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:9000/admin/crm/tasks/$taskId/relations" `
  -ContentType "application/json" `
  -Body $body
```

删除任务关联（按 relation id 或按 target）：
```powershell
$taskId = "task_xxx"
$body = @{
  relation_ids = @("trl_xxx")
} | ConvertTo-Json

Invoke-RestMethod -Method Delete `
  -Uri "http://localhost:9000/admin/crm/tasks/$taskId/relations" `
  -ContentType "application/json" `
  -Body $body
```

---

## 9. 数据库 ER 图（核心逻辑）

说明：下图是“业务核心实体关系图”，用于理解系统，不等同于 Medusa 全量物理表。

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ CART : owns

    LEAD ||--o{ OPPORTUNITY : converts_to
    CUSTOMER ||--o{ LEAD : linked_via_module_link
    CUSTOMER ||--o{ OPPORTUNITY : linked_via_module_link
    CUSTOMER ||--o{ TASK : linked_via_module_link

    PRODUCT ||--o{ PRODUCT_VARIANT : has
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT_VARIANT ||--o{ ORDER_ITEM : sold_as
    TASK ||--o{ TASK_RELATION : has

    LEAD {
      string id PK
      string name
      string email
      string company
      string source
      enum status
      string customer_id
      datetime created_at
      datetime updated_at
    }

    OPPORTUNITY {
      string id PK
      string name
      decimal estimated_amount
      string customer_id
      enum stage
      datetime expected_close_date
      string lead_id FK
      datetime created_at
      datetime updated_at
    }

    CUSTOMER {
      string id PK
      string email
      string first_name
      string last_name
    }

    ORDER {
      string id PK
      string customer_id FK
      string status
      datetime created_at
    }

    ORDER_ITEM {
      string id PK
      string order_id FK
      string variant_id FK
      int quantity
      decimal unit_price
    }

    PRODUCT {
      string id PK
      string title
      string status
    }

    PRODUCT_VARIANT {
      string id PK
      string product_id FK
      string title
      decimal price
    }

    CART {
      string id PK
      string customer_id FK
      string currency_code
    }

    TASK {
      string id PK
      string title
      string type
      string status
      string priority
      datetime due_date
      string customer_id
    }

    TASK_RELATION {
      string id PK
      string task_id FK
      string target_type
      string target_id
      string relationship
    }
```

## 9.1 导出真实数据库结构（PowerShell）
如果你要“物理级 ER 图”（和当前数据库 100% 对齐），先导出 schema：

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:9000/admin/schema" `
  | ConvertTo-Json -Depth 10 `
  | Out-File -FilePath ".\medusa-schema.json" -Encoding utf8
```

然后可把 `medusa-schema.json` 导入你的建模工具（如 dbdiagram、DBeaver、DataGrip）自动生成完整 ER 图。

---

## 10. 管理后台操作指引

## 10.1 Medusa Admin
- 地址：`http://localhost:9000/app`
- 常见操作：商品、库存、订单、客户管理
- CRM：通过自定义 Admin API + 前端/脚本调用维护 Lead 与 Opportunity

## 10.2 Strapi Admin
- 地址：`http://localhost:1337`
- 常见操作：内容模型管理、文章/页面内容发布

---

## 11. 运维与排障

## 11.1 常用命令（PowerShell）
查看容器状态：
```powershell
docker ps
```

停止基础设施：
```powershell
cd D:\work\project\026.artstore\www
npm run infra:down
```

## 11.2 常见问题
1. Medusa 启动但接口不可用
- 检查 Postgres/Redis 是否已启动。
- 检查 `apps/medusa/.env` 的 `DATABASE_URL` / `REDIS_URL`。

2. Storefront 无法下单
- 检查 `apps/storefront/.env.local` 中 `MEDUSA_BACKEND_URL`、publishable key。

3. CRM 表不存在
- 未执行迁移：
  - `npx medusa db:generate crm`
  - `npx medusa db:migrate`

4. 500 错误（CRM convert）
- 检查 `lead_id`、`customer_id` 是否存在。
- 检查请求体字段类型，尤其 `estimated_amount` 和日期格式。

---

## 12. 建议的后续完善
1. 为 CRM 路由增加统一的鉴权中间件与 RBAC。
2. 补齐 Opportunity 的完整 CRUD API。
3. 增加 CRM 事件订阅（例如：Lead 转化后通知销售）。
4. 把 ER 图拆成“逻辑图 + 物理图（基于实际数据库导出）”。
