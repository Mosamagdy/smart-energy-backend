Smart Energy ERP — Phases 1-5 Complete Implementation
Conventions (MUST follow strictly):

async/await only
const { query } = require('../../db') for all DB access
Errors: const err = new Error('رسالة'); err.statusCode = 4xx; throw err;
Each module: *.repository.js + *.service.js + *.controller.js + src/routes/*.route.js
Notifications via ../../utils/notify → notify(), notifyRole(), notifyDeptHead()
Every major event MUST notify general_manager role
All error messages in Arabic
PHASE 1 — Projects Module
New SQL tables (run first):
sql-- Purchase requests (when inventory is insufficient)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  item_name        VARCHAR(255) NOT NULL,
  quantity         INTEGER NOT NULL,
  unit             VARCHAR(50),
  reason           TEXT,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending',
  approved_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project  ON purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status   ON purchase_requests(status);

-- Project reports (submitted by project_manager or engineer)
CREATE TABLE IF NOT EXISTS project_reports (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'progress',
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  status      VARCHAR(30) NOT NULL DEFAULT 'open',
  attachments JSONB,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_reports_project ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_type    ON project_reports(report_type);

-- QHSE inspections (Quality, Health, Safety, Environment)
CREATE TABLE IF NOT EXISTS qhse_inspections (
  id               SERIAL PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_engineer INTEGER REFERENCES users(id) ON DELETE SET NULL,
  inspection_date  DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  safety_materials JSONB,
  report           TEXT,
  attachments      JSONB,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qhse_project ON qhse_inspections(project_id);

-- Link employees (workers) to projects
CREATE TABLE IF NOT EXISTS project_employees (
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_in_project VARCHAR(100),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, employee_id)
);
```

### Business Logic:

**Project creation:**
- Created automatically when quotation status = `client_approved`
- Linked to: `quotation_id`, `client_id`, `lead_id`, `department_id` (the department handling the project)
- Initial status: `planning`

**Project manager assignment:**
- Assigned by `dept_head` of the Projects department (NOT general_manager)
- `dept_head` role of the projects department has full access to assign managers

**Project manager full access:**
- Can view ALL employees belonging to the project's linked department only
- Assigns engineers/technicians from that department's employees
- Full access to `inventory_items` — can allocate materials
- When materials allocated: `inventory_movements` record created (type = 'out') + `quantity` in `inventory_items` decreases dynamically
- If quantity insufficient → must submit `purchase_request` instead
- Full access to `assets` table — can assign tools/vehicles to project
- Can create `project_reports` (type: progress, issue, incident)
- Can update task statuses

**Engineers access:**
- Can view their assigned tasks
- Can update their task status
- Can submit `project_reports` (type: issue, incident)

**QHSE department:**
- After project creation → `dept_head` of QHSE department assigns a QHSE engineer
- QHSE engineer submits `qhse_inspections` report with safety materials needed
- QHSE engineer can request safety materials from inventory (same purchase_request flow)

**Purchase request flow:**
```
project_manager or qhse_engineer submits purchase_request
  → notify finance_manager + general_manager + procurement dept_head
  → procurement processes it
  → procurement marks as 'ready'
  → notify warehouse_manager to add to inventory
  → warehouse_manager adds to inventory_items
  → notify project_manager that items are available
```

**Project statuses:** `planning → in_progress → testing → completed → delivered`

**Notifications:**
- Project created → notify project_manager role + GM
- Manager assigned → notify that manager
- Engineer assigned to task → notify that engineer
- Task completed → notify project_manager + GM
- All tasks completed → notify GM + finance_manager
- Purchase request submitted → notify finance_manager + GM + procurement dept_head
- Purchase request ready → notify warehouse_manager + project_manager + GM
- Project delivered → notify GM + finance_manager
- QHSE engineer assigned → notify that engineer + GM
- QHSE report submitted → notify QHSE dept_head + GM

### Endpoints:
```
POST   /api/projects                              — create project (auto or manual by GM/super_admin)
GET    /api/projects                              — list all projects (filtered by role)
GET    /api/projects/:id                          — full project details (tasks, team, materials)
PATCH  /api/projects/:id                          — update project info
PATCH  /api/projects/:id/status                   — update project status

POST   /api/projects/:id/assign-manager           — assign project manager (projects dept_head only)
POST   /api/projects/:id/employees                — assign employees from dept (project_manager only)
GET    /api/projects/:id/employees                — list project employees

POST   /api/projects/:id/tasks                    — create task
GET    /api/projects/:id/tasks                    — list tasks
PATCH  /api/projects/:id/tasks/:taskId            — update task (project_manager)
PATCH  /api/projects/:id/tasks/:taskId/status     — update task status (engineer or project_manager)

POST   /api/projects/:id/materials                — allocate materials from inventory (project_manager)
GET    /api/projects/:id/materials                — list allocated materials

POST   /api/projects/:id/assets                   — assign assets (project_manager)
GET    /api/projects/:id/assets                   — list project assets

POST   /api/projects/:id/purchase-requests        — submit purchase request (project_manager/qhse_engineer)
GET    /api/projects/:id/purchase-requests        — list purchase requests
PATCH  /api/purchase-requests/:id/status          — update purchase request status (procurement/warehouse)

POST   /api/projects/:id/reports                  — submit project report (project_manager/engineer)
GET    /api/projects/:id/reports                  — list project reports

POST   /api/projects/:id/qhse                     — create QHSE inspection (qhse dept_head)
GET    /api/projects/:id/qhse                     — list QHSE inspections
PATCH  /api/projects/:id/qhse/:qhseId             — submit QHSE report (qhse engineer)

POST   /api/projects/:id/deliver                  — mark delivered + upload docs

GET    /api/projects/dashboard/:deptId            — department dashboard (dept_head)
```

### Role access matrix for projects:
```
super_admin       → full access to everything
general_manager   → read all + approve statuses + receive all notifications
projects dept_head → assign project managers, view all projects
project_manager   → full access to their project(s): tasks, employees (from dept), inventory, assets
engineer          → view assigned tasks + update status + submit issue reports
finance_manager   → view project financial data + purchase requests
qhse dept_head    → assign qhse engineers to any project
qhse engineer     → submit qhse inspection reports
warehouse_manager → add inventory when purchase arrives
procurement dept_head → process purchase requests

PHASE 2 — Finance Module
New SQL tables:
sqlCREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  invoice_id     INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount         NUMERIC(16,2) NOT NULL,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference      VARCHAR(100),
  notes          TEXT,
  recorded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- Chart of accounts (شجرة الحسابات)
CREATE TABLE IF NOT EXISTS accounts (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  name_ar       VARCHAR(255),
  type          VARCHAR(30) NOT NULL,
  parent_id     INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal entries (قيود محاسبية)
CREATE TABLE IF NOT EXISTS journal_entries (
  id            SERIAL PRIMARY KEY,
  entry_number  VARCHAR(50) NOT NULL UNIQUE,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT,
  reference_type VARCHAR(50),
  reference_id  INTEGER,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal entry lines (بنود القيد)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id              SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit           NUMERIC(16,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(16,2) NOT NULL DEFAULT 0,
  description     TEXT
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  account_id   INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  amount       NUMERIC(16,2) NOT NULL,
  description  TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category     VARCHAR(100),
  receipt_path TEXT,
  recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);
```

### Business Logic:

**Invoices:**
- Auto-created when project = `completed` OR manually by finance_manager
- Invoice number: `INV-{YEAR}-{4-digit-sequence}` e.g. `INV-2026-0001`
- Statuses: `draft → sent → partial → paid → overdue`
- Overdue: cron or on-read check — if `due_date < NOW()` and not paid → `overdue`

**Payments:**
- Each payment recorded separately
- `paid_amount` on invoice updated automatically after each payment
- If `paid_amount >= total_amount` → invoice status → `paid`
- If `0 < paid_amount < total_amount` → status → `partial`

**Chart of accounts (شجرة الحسابات):**
- Hierarchical tree: parent_id self-reference
- Account types: `asset`, `liability`, `equity`, `revenue`, `expense`
- Seed default accounts:
```
  1000 - الأصول (Assets)
    1100 - الأصول المتداولة
      1110 - النقدية والبنوك
      1120 - الذمم المدينة (عملاء)
  2000 - الخصوم (Liabilities)
    2100 - الذمم الدائنة (موردون)
  3000 - حقوق الملكية (Equity)
  4000 - الإيرادات (Revenue)
    4100 - إيرادات المشاريع
    4200 - إيرادات الصيانة
  5000 - المصروفات (Expenses)
    5100 - مصروفات المشاريع
    5200 - مصروفات الرواتب
    5300 - مصروفات التشغيل
Journal entries:

Auto-created when invoice is paid: Debit cash/bank → Credit revenue
Auto-created when expense recorded: Debit expense account → Credit cash/bank
Manual entries allowed for finance_manager

Department dashboard for Finance:
json{
  "total_revenue": 0,
  "total_expenses": 0,
  "net_profit": 0,
  "outstanding_invoices": 0,
  "overdue_invoices": 0,
  "monthly_revenue": [],
  "top_projects_by_revenue": []
}
```

### Endpoints:
```
POST   /api/finance/invoices                       — create invoice
GET    /api/finance/invoices                       — list (filter: status, project_id, date range)
GET    /api/finance/invoices/:id                   — invoice details + payment history
PATCH  /api/finance/invoices/:id                   — update invoice
PATCH  /api/finance/invoices/:id/status            — update status
POST   /api/finance/invoices/:id/payments          — record payment (updates paid_amount auto)
GET    /api/finance/invoices/:id/payments          — list payments

POST   /api/finance/expenses                       — record expense
GET    /api/finance/expenses                       — list expenses (filter: project_id, category)
GET    /api/finance/expenses/:id                   — expense details

GET    /api/finance/accounts                       — get chart of accounts (tree structure)
POST   /api/finance/accounts                       — create account
PATCH  /api/finance/accounts/:id                   — update account

POST   /api/finance/journal-entries               — create journal entry
GET    /api/finance/journal-entries               — list journal entries
GET    /api/finance/journal-entries/:id           — entry with lines

GET    /api/finance/summary                        — overall financial summary (GM only)
GET    /api/finance/projects/:projectId/summary    — per-project P&L
GET    /api/finance/dashboard                      — finance dept dashboard
GET    /api/finance/reports/revenue                — revenue by period
GET    /api/finance/reports/expenses               — expenses by category
GET    /api/finance/reports/profit-loss            — P&L statement

PHASE 3 — Maintenance Module
New SQL table:
sqlCREATE TABLE IF NOT EXISTS maintenance_contracts (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  contract_number VARCHAR(100) NOT NULL UNIQUE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(16,2) NOT NULL DEFAULT 0,
  status          VARCHAR(30) NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_project ON maintenance_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_status  ON maintenance_contracts(status);
```

### Business Logic:

**Asset registration (after project delivery):**
- Each installed asset registered: serial_number, warranty dates, location, project_id
- Asset status: `installed`, `operational`, `needs_maintenance`, `decommissioned`

**Maintenance scheduling:**
- Types: `scheduled`, `emergency`, `warranty`
- Statuses: `scheduled → in_progress → completed`
- Auto-alerts 30 days before: warranty expiry, scheduled maintenance, contract renewal

**Notifications:**
- Maintenance scheduled → notify assigned engineer + GM
- Maintenance completed → notify GM + finance_manager (for billing)
- Warranty expiring in 30 days → notify GM + maintenance dept_head
- Contract expiring in 30 days → notify GM + finance_manager + client

### Endpoints:
```
POST   /api/maintenance/assets                     — register asset after delivery
GET    /api/maintenance/assets                     — list all assets (filter: project_id, status)
GET    /api/maintenance/assets/:id                 — asset details + full maintenance history
PATCH  /api/maintenance/assets/:id                 — update asset info/status

POST   /api/maintenance/records                    — create maintenance record
GET    /api/maintenance/records                    — list (filter: asset_id, type, status)
GET    /api/maintenance/records/:id                — record details
PATCH  /api/maintenance/records/:id/status         — update status

POST   /api/maintenance/contracts                  — create maintenance contract
GET    /api/maintenance/contracts                  — list contracts
GET    /api/maintenance/contracts/:id              — contract details
PATCH  /api/maintenance/contracts/:id              — update contract

GET    /api/maintenance/alerts                     — all upcoming: warranty + maintenance + contracts (next 30 days)
GET    /api/maintenance/dashboard                  — maintenance dept dashboard
```

---

## PHASE 4 — Analytics Module

### Business Logic:

**All analytics are read-only SQL aggregations — no new tables needed.**

**Access:**
- `super_admin` + `general_manager` → see everything
- `dept_head` → sees only their department's data
- Each department has its own dashboard endpoint

**Top performing departments endpoint:**
Returns departments ranked by:
1. Revenue generated (from invoices linked to their projects)
2. Projects completed
3. Employee headcount
4. Leads converted

### Endpoints:
```
GET    /api/analytics/dashboard                    — main GM dashboard with all KPIs
GET    /api/analytics/departments/performance      — all departments ranked by revenue + projects
GET    /api/analytics/leads                        — leads funnel: total, by stage, conversion rate, by period
GET    /api/analytics/projects                     — projects: by status, by department, timeline, completion rate
GET    /api/analytics/finance                      — revenue + expenses + profit by month/quarter/year
GET    /api/analytics/hr                           — headcount by dept, avg evaluation scores, leave stats
GET    /api/analytics/maintenance                  — completion rate, overdue, avg response time
GET    /api/analytics/inventory                    — stock levels, low stock items, most used materials
GET    /api/analytics/departments/:deptId          — single department full dashboard
Main dashboard response structure:
json{
  "leads":       { "total": 0, "won": 0, "lost": 0, "in_progress": 0, "conversion_rate": 0 },
  "projects":    { "total": 0, "planning": 0, "in_progress": 0, "completed": 0, "delivered": 0 },
  "finance":     { "total_invoiced": 0, "total_paid": 0, "outstanding": 0, "overdue": 0, "net_profit": 0 },
  "employees":   { "total": 0, "active": 0, "by_department": [] },
  "maintenance": { "scheduled": 0, "overdue": 0, "completed_this_month": 0 },
  "top_departments": [{ "name": "", "revenue": 0, "projects": 0 }]
}
```

---

## PHASE 5 — Client Portal

### Business Logic:

**Client user:**
- Role = `client`, created by GM when quotation is approved
- Login: email + password, NO OTP required
- Sees ONLY their own data (all queries filtered by `client_id = req.user.id`)

**Client can:**
- View their quotations + approve/reject
- View their project progress (% based on completed tasks / total tasks)
- View their invoices + payment status
- View their notifications
- View their maintenance contracts

### Endpoints:
```
GET    /api/client/profile                         — client profile
GET    /api/client/quotations                      — my quotations
PATCH  /api/client/quotations/:id/respond          — approve or reject: body { action: 'approve'|'reject', reason? }
GET    /api/client/projects                        — my projects + progress percentage
GET    /api/client/projects/:id                    — project detail + task progress
GET    /api/client/invoices                        — my invoices
GET    /api/client/invoices/:id                    — invoice detail + payment history
GET    /api/client/maintenance                     — my maintenance contracts + upcoming visits
GET    /api/client/notifications                   — my notifications (unread first)
```

**When client approves quotation:**
```
quotation.status → 'client_approved'
→ create project automatically
→ notify GM + finance_manager + projects dept_head + quotation_specialist
→ lead.status → 'won'
```

---

## PHASE 6 — Department Dashboards (for ALL departments)

Every `dept_head` should have a dashboard specific to their department. Add this generic endpoint that returns relevant data based on the department type:
```
GET    /api/departments/:id/dashboard
```

Returns based on department name pattern:
- **Sales/مبيعات** → leads stats, won/lost, pipeline value
- **HR/موارد بشرية** → headcount, leaves pending, expiring documents
- **Finance/مالية** → invoices outstanding, revenue this month, expenses
- **Projects/مشاريع** → active projects, tasks overdue, team utilization
- **Maintenance/صيانة** → upcoming maintenance, overdue alerts, contracts expiring
- **QHSE/جودة** → inspections this month, issues reported, completion rate
- **Procurement/مشتريات** → pending purchase requests, approved, completed

---

## Implementation Order (strict):
```
Phase 1:
  1. Run SQL for new tables
  2. src/modules/projects/projects.repository.js
  3. src/modules/projects/projects.service.js
  4. src/modules/projects/projects.controller.js
  5. src/routes/projects.route.js
  6. Update src/routes/index.js
  7. npm run dev → verify no errors
  8. Test all project endpoints

Phase 2:
  1. Run SQL for payments, accounts, journal_entries, journal_entry_lines, expenses
  2. Seed default chart of accounts
  3. src/modules/finance/finance.repository.js
  4. src/modules/finance/finance.service.js
  5. src/modules/finance/finance.controller.js
  6. src/routes/finance.route.js
  7. Update src/routes/index.js
  8. Test all finance endpoints

Phase 3:
  1. Run SQL for maintenance_contracts
  2. src/modules/maintenance/maintenance.repository.js
  3. src/modules/maintenance/maintenance.service.js
  4. src/modules/maintenance/maintenance.controller.js
  5. src/routes/maintenance.route.js
  6. Update src/routes/index.js
  7. Test all maintenance endpoints

Phase 4:
  1. src/modules/analytics/analytics.repository.js
  2. src/modules/analytics/analytics.service.js
  3. src/modules/analytics/analytics.controller.js
  4. src/routes/analytics.route.js
  5. Update src/routes/index.js
  6. Test all analytics endpoints

Phase 5:
  1. src/modules/client/client.repository.js
  2. src/modules/client/client.service.js
  3. src/modules/client/client.controller.js
  4. src/routes/client.route.js
  5. Update src/routes/index.js
  6. Test all client endpoints

Phase 6:
  1. Add dashboard logic to departments.service.js
  2. Add GET /api/departments/:id/dashboard to departments.route.js
  3. Test department dashboards

After completing ALL phases:
1. Create IMPLEMENTATION_REPORT.md:
markdown# Smart Energy ERP — Implementation Report

## Summary
- Total phases completed: X
- Total endpoints added: X
- New DB tables: X

## Phase 1 — Projects
### Files created:
- src/modules/projects/projects.repository.js
- src/modules/projects/projects.service.js
- src/modules/projects/projects.controller.js
- src/routes/projects.route.js

### Endpoints:
| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| POST | /api/projects | Create project | GM, super_admin |
| ... | | | |

### DB Tables used:
- projects, tasks, project_employees, purchase_requests, project_reports, qhse_inspections

### Notifications:
- Project created → GM + project_manager role
- ...

## Phase 2 — Finance
[same structure]

## Phase 3 — Maintenance
[same structure]

## Phase 4 — Analytics
[same structure]

## Phase 5 — Client Portal
[same structure]

## Phase 6 — Department Dashboards
[same structure]

## New DB Tables Created:
| Table | Phase | Purpose |
|-------|-------|---------|
| purchase_requests | 1 | Track material purchase requests |
| ... | | |

## Known Issues / Notes:
- [list any issues or decisions made]
2. Create Smart_Energy_ERP.postman_collection.json:
Full Postman collection with:

Collection variable: base_url = http://localhost:3000/api
Collection variable: token = (empty, filled by login test script)
All folders organized by module
Every request has:

Pre-request: pm.request.headers.add({ key: 'Authorization', value: 'Bearer ' + pm.collectionVariables.get('token') })
Realistic Arabic example bodies for a solar/smart energy company



Login requests have this test script:
javascriptif (pm.response.code === 200) {
  const res = pm.response.json();
  if (res.data?.token) {
    pm.collectionVariables.set('token', res.data.token);
    console.log('Token saved:', res.data.token.substring(0, 20) + '...');
  }
}
```

Collection folder structure:
```
Smart Energy ERP
├── 🔐 Auth
│   ├── POST Login Super Admin
│   ├── POST Login GM (Step 1)
│   ├── POST Verify OTP (Step 2)
│   ├── GET  Me
│   ├── POST Create General Manager
│   └── POST Create Dept Head
├── 🏢 Departments
├── 👥 HR
├── 📊 CRM — Leads
├── 🔍 Inspections
├── 💰 Quotations
├── 🏗️  Projects
├── 💳 Finance
├── 🔧 Maintenance
├── 📈 Analytics
├── 👤 Client Portal
└── 🔔 Notifications

Critical Rules:

Inventory deduction is dynamic — when project_manager allocates materials, inventory_items.quantity decreases immediately. If quantity < requested, return 400 error with message "الكمية المطلوبة غير متوفرة في المخزون — يرجى إنشاء طلب شراء" and do NOT deduct.
Department filtering — project_manager can ONLY assign employees from the department linked to the project (projects.department_id). Query: WHERE employees.department_id = project.department_id
Every notification MUST include GM — await notifyRole('general_manager', {...}) on every significant event.
Client data isolation — every client endpoint must have WHERE client_id = req.user.id or equivalent filter. Never return other clients' data.
Purchase request flow is mandatory — never allow project_manager to bypass inventory check. Always validate stock before allocation.
Chart of accounts is hierarchical — when returning accounts, build tree structure with children arrays, not flat list.
Project progress = (completed tasks / total tasks) * 100 — always calculated dynamically, never stored.
Invoice auto-status — after every payment recorded, recalculate: if paid >= total → paid, else if paid > 0 → partial. Check due_date on read: if due_date < today and not paid → overdue.