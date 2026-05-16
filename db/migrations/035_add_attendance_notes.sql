-- Smart Energy ERP
-- Migration 035: Add Notes Column to Attendance Table
-- Purpose: Add ability to add notes/warnings to attendance records
-- Date: 2026-05-02

BEGIN;

-- Add notes column to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN attendance.notes IS 'Notes or warnings about employee attendance for the day';

COMMIT;
