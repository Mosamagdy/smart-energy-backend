-- ============================================================================
-- PHASE 1: Projects Module - New Tables
-- Smart Energy ERP System
-- ============================================================================

-- Purchase requests (when inventory is insufficient)
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

-- Add project-related columns to projects table if not exists
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS project_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_quotation_id ON projects(quotation_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(project_manager_id);

-- Comments for documentation
COMMENT ON TABLE purchase_requests IS 'Track material purchase requests when inventory is insufficient';
COMMENT ON TABLE project_reports IS 'Project progress, issue, and incident reports';
COMMENT ON TABLE qhse_inspections IS 'Quality, Health, Safety, Environment inspections';
COMMENT ON TABLE project_employees IS 'Many-to-many link between employees and projects';
