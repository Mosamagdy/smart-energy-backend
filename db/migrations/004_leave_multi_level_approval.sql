-- Migration 004: Add dept_head_approved status to leave_requests
-- This enables the multi-level approval workflow

ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_status_check 
CHECK (status IN ('pending', 'dept_head_approved', 'approved', 'rejected'));
