-- PHASE 5: Client Portal Extensions
-- Purpose: Client support messaging and project rating system

-- ============================================
-- 1. CLIENT SUPPORT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_support_messages (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sales_rep_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message             TEXT NOT NULL,
  is_from_client      BOOLEAN NOT NULL DEFAULT true, -- true = from client, false = from sales rep
  is_read             BOOLEAN NOT NULL DEFAULT false,
  parent_message_id   INTEGER REFERENCES client_support_messages(id) ON DELETE SET NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_messages_project ON client_support_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_client ON client_support_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sales_rep ON client_support_messages(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON client_support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread ON client_support_messages(is_read) WHERE is_read = false;

-- Comments for documentation
COMMENT ON TABLE client_support_messages IS 'Chat messages between clients and their assigned sales representatives';
COMMENT ON COLUMN client_support_messages.is_from_client IS 'Direction of message: true=client sent, false=sales rep replied';
COMMENT ON COLUMN client_support_messages.parent_message_id IS 'For threading/reply tracking';

-- ============================================
-- 2. PROJECT RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_ratings (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
  comment             TEXT,
  is_anonymous        BOOLEAN NOT NULL DEFAULT false,
  response_from_company TEXT,
  responded_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  responded_at        TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_ratings_project ON project_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_client ON project_ratings(client_id);
CREATE INDEX IF NOT EXISTS idx_project_ratings_rating ON project_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_project_ratings_created ON project_ratings(created_at DESC);

-- Unique constraint: One rating per project per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_client_rating 
ON project_ratings(project_id, client_id);

-- Comments for documentation
COMMENT ON TABLE project_ratings IS 'Client ratings and reviews for delivered projects (30-day post-delivery)';
COMMENT ON COLUMN project_ratings.rating IS 'Star rating: 1-5';
COMMENT ON COLUMN project_ratings.is_anonymous IS 'Whether client wants to hide their name from public view';
COMMENT ON COLUMN project_ratings.response_from_company IS 'Company response to the review';

-- ============================================
-- 3. SALES REPRESENTATIVE ASSIGNMENT (Add to projects table if missing)
-- ============================================
-- Add delivered_at timestamp column to track when project was delivered
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_projects_delivered_at ON projects(delivered_at);
    COMMENT ON COLUMN projects.delivered_at IS 'Timestamp when project status changed to delivered';
  END IF;
END $$;

-- Add rating_email_sent flag to track if rating request email was sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'rating_email_sent'
  ) THEN
    ALTER TABLE projects ADD COLUMN rating_email_sent BOOLEAN DEFAULT FALSE;
    ALTER TABLE projects ADD COLUMN rating_email_sent_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_projects_rating_email_sent ON projects(rating_email_sent);
    COMMENT ON COLUMN projects.rating_email_sent IS 'Flag to prevent duplicate rating emails';
    COMMENT ON COLUMN projects.rating_email_sent_at IS 'Timestamp when rating email was sent';
  END IF;
END $$;

-- Add assigned_sales_rep_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'assigned_sales_rep_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN assigned_sales_rep_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_projects_assigned_sales_rep ON projects(assigned_sales_rep_id);
    COMMENT ON COLUMN projects.assigned_sales_rep_id IS 'Sales representative assigned to this project/client';
  END IF;
END $$;

-- ============================================
-- 4. PROJECT DELIVERY TRACKING VIEW
-- ============================================
CREATE OR REPLACE VIEW vw_projects_ready_for_rating AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.status,
  p.delivered_at,
  c.id AS client_id,
  c.first_name || ' ' || c.last_name AS client_name,
  c.email AS client_email,
  u.first_name || ' ' || u.last_name AS assigned_sales_rep_name,
  u.email AS assigned_sales_rep_email,
  (CURRENT_DATE - p.delivered_at::date) AS days_since_delivery
FROM projects p
INNER JOIN users c ON p.client_id = c.id
LEFT JOIN users u ON p.assigned_sales_rep_id = u.id
WHERE p.status = 'delivered'
  AND p.delivered_at IS NOT NULL
  AND (CURRENT_DATE - p.delivered_at::date) >= 30
  AND NOT EXISTS (
    SELECT 1 FROM project_ratings pr 
    WHERE pr.project_id = p.id AND pr.client_id = c.id
  )
ORDER BY p.delivered_at DESC;

COMMENT ON VIEW vw_projects_ready_for_rating IS 'Projects delivered 30+ days ago without ratings - trigger email notifications';

-- ============================================
-- 5. SEED DATA FOR TESTING (Optional)
-- ============================================
-- Uncomment and modify based on your test data needs
-- INSERT INTO client_support_messages (project_id, client_id, sales_rep_id, message, is_from_client)
-- VALUES 
--   (1, 2, 5, 'مرحباً، لدي استفسار بخصوص المشروع', true),
--   (1, 2, 5, 'أهلاً بك، كيف يمكنني مساعدتك؟', false)
-- ON CONFLICT DO NOTHING;

-- INSERT INTO project_ratings (project_id, client_id, rating, comment)
-- VALUES 
--   (1, 2, 5, 'مشروع ممتاز، شكراً لكم!')
-- ON CONFLICT DO NOTHING;
