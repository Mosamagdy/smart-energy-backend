-- PHASE 3: Installed Assets & Maintenance Module
-- Purpose: Track customer-owned assets installed at project sites for maintenance & warranty

-- ============================================
-- 1. INSTALLED ASSETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS installed_assets (
  id                  SERIAL PRIMARY KEY,
  asset_name          VARCHAR(255) NOT NULL,
  client_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category            VARCHAR(100) NOT NULL, -- فئة الأصل (Equipment Category)
  serial_number       VARCHAR(100) NOT NULL UNIQUE,
  installation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  location_address    TEXT,
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  assigned_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  warranty_expiry     DATE,
  status              VARCHAR(30) NOT NULL DEFAULT 'operational', -- operational, needs_maintenance, decommissioned
  manufacturer        VARCHAR(255),
  model_number        VARCHAR(100),
  power_rating        VARCHAR(50), -- e.g., "5kW", "10kW"
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_installed_assets_project ON installed_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_installed_assets_client ON installed_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_installed_assets_category ON installed_assets(category);
CREATE INDEX IF NOT EXISTS idx_installed_assets_warranty ON installed_assets(warranty_expiry);
CREATE INDEX IF NOT EXISTS idx_installed_assets_status ON installed_assets(status);
CREATE INDEX IF NOT EXISTS idx_installed_assets_serial ON installed_assets(serial_number);

-- Comments for documentation
COMMENT ON TABLE installed_assets IS 'Customer-owned assets installed at project sites for maintenance tracking';
COMMENT ON COLUMN installed_assets.category IS 'فئة الأصل - Equipment category/type';
COMMENT ON COLUMN installed_assets.warranty_expiry IS 'Used for auto-alerts 30 days before expiry';

-- ============================================
-- 2. MAINTENANCE VISITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_visits (
  id                  SERIAL PRIMARY KEY,
  asset_id            INTEGER NOT NULL REFERENCES installed_assets(id) ON DELETE CASCADE,
  visit_type          VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, emergency, warranty
  visit_date          DATE NOT NULL,
  scheduled_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  description         TEXT,
  work_performed      TEXT,
  materials_used      JSONB, -- Array of materials used during visit
  travel_cost         NUMERIC(10, 2) DEFAULT 0,
  labor_cost          NUMERIC(10, 2) DEFAULT 0,
  total_cost          NUMERIC(10, 2) DEFAULT 0,
  billable            BOOLEAN NOT NULL DEFAULT false,
  invoice_id          INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  completion_notes    TEXT,
  completed_at        TIMESTAMP WITH TIME ZONE,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_visits_asset ON maintenance_visits(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_visits_status ON maintenance_visits(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_visits_date ON maintenance_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_visits_engineer ON maintenance_visits(assigned_engineer_id);

-- Comments for documentation
COMMENT ON TABLE maintenance_visits IS 'Maintenance visits linked to installed assets';
COMMENT ON COLUMN maintenance_visits.visit_type IS 'Type: scheduled, emergency, or warranty';
COMMENT ON COLUMN maintenance_visits.billable IS 'Whether this visit should be invoiced to client';

-- ============================================
-- 3. MAINTENANCE CONTRACTS (Enhanced from plan2.md)
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_contracts (
  id              SERIAL PRIMARY KEY,
  contract_number VARCHAR(100) NOT NULL UNIQUE,
  client_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(16, 2) NOT NULL DEFAULT 0,
  visit_frequency VARCHAR(50), -- monthly, quarterly, bi-annual, annual
  max_visits      INTEGER DEFAULT 0, -- 0 = unlimited
  included_assets JSONB, -- Array of asset IDs covered by this contract
  terms_conditions  TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'active', -- active, expired, terminated
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  renewal_notice_days INTEGER DEFAULT 30,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_client ON maintenance_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_project ON maintenance_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_status ON maintenance_contracts(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_end_date ON maintenance_contracts(end_date);

-- Comments for documentation
COMMENT ON TABLE maintenance_contracts IS 'Maintenance contracts for installed assets with auto-renewal tracking';
COMMENT ON COLUMN maintenance_contracts.included_assets IS 'JSON array of asset IDs covered by this contract';
COMMENT ON COLUMN maintenance_contracts.auto_renew IS 'Trigger auto-renewal notification';

-- ============================================
-- 4. WARRANTY ALERTS VIEW (for 30-day alerts)
-- ============================================
CREATE OR REPLACE VIEW vw_warranty_expiring_soon AS
SELECT 
  ia.id AS asset_id,
  ia.asset_name,
  ia.serial_number,
  ia.client_id,
  ia.project_id,
  ia.warranty_expiry,
  ia.assigned_engineer_id,
  p.name AS project_name,
  u.first_name || ' ' || u.last_name AS client_name,
  u.email AS client_email,
  u.phone AS client_phone,
  CURRENT_DATE AS today,
  (ia.warranty_expiry - CURRENT_DATE) AS days_until_expiry
FROM installed_assets ia
LEFT JOIN projects p ON ia.project_id = p.id
LEFT JOIN users u ON ia.client_id = u.id
WHERE ia.warranty_expiry IS NOT NULL
  AND ia.warranty_expiry >= CURRENT_DATE
  AND ia.warranty_expiry <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ia.warranty_expiry ASC;

COMMENT ON VIEW vw_warranty_expiring_soon IS 'Assets with warranty expiring within 30 days for auto-alerts';

-- ============================================
-- 5. CONTRACT EXPIRY ALERTS VIEW
-- ============================================
CREATE OR REPLACE VIEW vw_contracts_expiring_soon AS
SELECT 
  mc.id AS contract_id,
  mc.contract_number,
  mc.client_id,
  mc.project_id,
  mc.end_date,
  mc.status,
  mc.auto_renew,
  mc.renewal_notice_days,
  p.name AS project_name,
  u.first_name || ' ' || u.last_name AS client_name,
  u.email AS client_email,
  (mc.end_date - CURRENT_DATE) AS days_until_expiry
FROM maintenance_contracts mc
LEFT JOIN projects p ON mc.project_id = p.id
LEFT JOIN users u ON mc.client_id = u.id
WHERE mc.status = 'active'
  AND mc.end_date >= CURRENT_DATE
  AND mc.end_date <= CURRENT_DATE + (mc.renewal_notice_days || ' days')::INTERVAL
ORDER BY mc.end_date ASC;

COMMENT ON VIEW vw_contracts_expiring_soon IS 'Contracts expiring soon based on renewal notice period';

-- ============================================
-- 6. SEED DATA FOR TESTING (Optional - Commented out)
-- ============================================
-- Uncomment and modify based on your test data needs
-- INSERT INTO installed_assets (asset_name, client_id, project_id, category, serial_number, location_address, latitude, longitude, warranty_expiry, manufacturer, model_number, power_rating, status, notes)
-- VALUES 
--   ('Solar Inverter 10kW', 2, 1, 'Inverter', 'INV-2026-001', 'Riyadh, Saudi Arabia', 24.7136, 46.6753, CURRENT_DATE + INTERVAL '365 days', 'SolarTech Industries', 'ST-INV-10K', '10kW', 'operational', 'Main inverter for building A'),
--   ('Solar Panel Array', 2, 1, 'Solar Panel', 'SP-2026-001', 'Riyadh, Saudi Arabia', 24.7136, 46.6753, CURRENT_DATE + INTERVAL '730 days', 'GreenEnergy Co', 'GE-PANEL-500', '500W per panel', 'operational', '20 panels installed on roof'),
--   ('Battery Storage System', 2, 1, 'Battery', 'BAT-2026-001', 'Riyadh, Saudi Arabia', 24.7136, 46.6753, CURRENT_DATE + INTERVAL '1095 days', 'PowerStore Ltd', 'PS-BAT-20K', '20kWh', 'operational', 'Backup power system')
-- ON CONFLICT (serial_number) DO NOTHING;

-- INSERT INTO maintenance_contracts (contract_number, client_id, project_id, start_date, end_date, value, visit_frequency, max_visits, terms_conditions, status, auto_renew, renewal_notice_days)
-- VALUES 
--   ('MC-2026-0001', 2, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', 15000.00, 'quarterly', 4, 'Quarterly maintenance visits included', 'active', true, 30),
--   ('MC-2026-0002', 2, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '730 days', 25000.00, 'monthly', 24, 'Monthly preventive maintenance with emergency support', 'active', false, 60)
-- ON CONFLICT (contract_number) DO NOTHING;
