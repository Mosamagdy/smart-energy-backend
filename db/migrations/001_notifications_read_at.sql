-- شغّل الملف ده مرة واحدة على قاعدتك إذا ظهر الخطأ: column "read_at" does not exist
-- مثال: psql -U postgres -d system -f db/migrations/001_notifications_read_at.sql

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
