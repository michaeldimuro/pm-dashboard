-- Migration: Add blocked status and metadata fields
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/boycoadfvjcazqcslfxr/sql/new
-- Date: 2026-02-11

-- Step 1: Add 'blocked' value to task_status enum
-- Note: Must be run separately from other statements
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'blocked';

-- Step 2: Add blocked_reason column for tracking why tasks are blocked
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Step 3: Add review_outcome column for tracking deliverables/outcomes
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_outcome TEXT;

-- Step 4: Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_reason ON tasks(blocked_reason) WHERE blocked_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_review_outcome ON tasks(review_outcome) WHERE review_outcome IS NOT NULL;

-- Verification: Check columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('blocked_reason', 'review_outcome');

-- Verification: Check enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'task_status'::regtype 
ORDER BY enumsortorder;
