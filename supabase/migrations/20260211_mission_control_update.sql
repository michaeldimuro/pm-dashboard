-- Migration: Mission Control Update
-- Add ticket_number as auto-increment integer

-- First, ensure the tasks table exists and has necessary columns
-- Add ticket_number as SERIAL if not exists
DO $$ 
BEGIN
  -- Add ticket_number column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tasks' AND column_name = 'ticket_number') THEN
    ALTER TABLE public.tasks ADD COLUMN ticket_number SERIAL;
  END IF;
  
  -- If it exists as TEXT, convert to integer
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'tasks' AND column_name = 'ticket_number' AND data_type = 'text') THEN
    ALTER TABLE public.tasks DROP COLUMN ticket_number;
    ALTER TABLE public.tasks ADD COLUMN ticket_number SERIAL;
  END IF;
END $$;

-- Create unique index on ticket_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_ticket_number ON public.tasks(ticket_number);

-- Create sequence if it doesn't exist (for manual ticket number assignment)
CREATE SEQUENCE IF NOT EXISTS task_ticket_seq START 1;

-- Ensure task_comments table exists
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create comments on their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their tasks" ON public.task_comments FOR SELECT 
  USING (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can create comments on their tasks" ON public.task_comments FOR INSERT 
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.task_comments FOR UPDATE
  USING (user_id = auth.uid());
