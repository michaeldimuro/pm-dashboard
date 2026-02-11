-- Migration: Add comments and checklist support to tasks
-- Date: 2026-02-11

-- Add ticket_number field to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_checklist_items table
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON public.task_checklist_items(task_id);

-- Enable Row Level Security
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their tasks" ON public.task_comments FOR SELECT 
  USING (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can create comments on their tasks" ON public.task_comments FOR INSERT 
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for checklists
CREATE POLICY "Users can view checklists on their tasks" ON public.task_checklist_items FOR SELECT 
  USING (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage checklists on their tasks" ON public.task_checklist_items FOR ALL 
  USING (task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()));

-- Add updated_at triggers if they don't exist
CREATE TRIGGER IF NOT EXISTS update_task_comments_updated_at 
  BEFORE UPDATE ON public.task_comments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER IF NOT EXISTS update_task_checklist_items_updated_at 
  BEFORE UPDATE ON public.task_checklist_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
