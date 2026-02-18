// Core types for Mission Control

export type Business = 'capture_health' | 'inspectable' | 'synergy';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  businesses: Business[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  business: Business;
  name: string;
  description?: string;
  color: string;
  status: 'active' | 'archived' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  ticket_number?: number;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assignee_id?: string;
  labels: string[];
  order: number;
  blocked_reason?: string;
  review_outcome?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  project?: Project;
  assignee?: User;
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: User;
}

export interface KanbanColumn {
  id: string;
  project_id: string;
  name: string;
  color: string;
  order: number;
  created_at: string;
}

export interface KanbanItem {
  id: string;
  column_id: string;
  task_id: string;
  order: number;
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  business?: Business;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  calendar_source: 'local' | 'google' | 'apple' | 'outlook';
  external_id?: string;
  color?: string;
  reminder_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  business?: Business;
  project_id?: string;
  title: string;
  content: string;
  parent_id?: string;
  position_x?: number;
  position_y?: number;
  color?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  label?: string;
  created_at: string;
}

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'proposal_sent' 
  | 'negotiating' 
  | 'won' 
  | 'lost';

export interface Lead {
  id: string;
  user_id: string;
  business: Business;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: LeadStatus;
  value?: number;
  notes?: string;
  last_contacted?: string;
  next_followup?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WebhookEventType = 
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'calendar_event'
  | 'lead_updated'
  | 'note_created';

export interface WebhookSubscription {
  id: string;
  user_id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  last_triggered?: string;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// UI State Types
export interface SidebarState {
  collapsed: boolean;
  activeSection: string;
}

export interface DragItem {
  id: string;
  type: 'task' | 'note';
  columnId?: string;
}

// Filter types
export interface TaskFilters {
  business?: Business | 'all';
  priority?: Task['priority'] | 'all';
  assignee?: string | 'all';
  search?: string;
}

// Assignee options — all team members (humans + agents)
// IDs are actual user UUIDs from the database
export const ASSIGNEES = [
  { id: 'ce844db6-780d-4bb2-8859-6e860b0c26c1', name: 'Michael' },
  { id: 'e703aeed-3e46-413f-bc27-2fce063176bc', name: 'Xandus' },
  { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', name: 'Atlas' },
  { id: 'f0e1d2c3-b4a5-4968-8776-5a4b3c2d1e0f', name: 'Forge' },
] as const;

export type AssigneeId = typeof ASSIGNEES[number]['id'];
