# Mission Control Migration Instructions

## ✅ Already Completed (Commit 078b457)

### Frontend Changes:
1. **Added 'Blocked' column** to Kanban board (red color: #ef4444)
2. **Added blocked_reason field** - prompts for reason when moving to Blocked
3. **Added review_outcome field** - prompts for deliverable when moving to Review
4. **Removed Jarvis from assignees** - only Michael and Xandus now
5. **Locked title/description** after task moves past Backlog
6. **Display blocked_reason** on TaskCard when blocked
7. **Display review_outcome** in DoneTasksPage for completed tasks

### Files Modified:
- `src/types/index.ts` - Added blocked status, new fields, removed Jarvis
- `src/pages/Kanban/KanbanBoard.tsx` - Added Blocked column, transition modal
- `src/pages/Kanban/TaskCard.tsx` - Display blocked indicator
- `src/pages/Kanban/TaskModal.tsx` - Read-only logic, display metadata fields
- `src/pages/Kanban/DoneTasksPage.tsx` - Display review outcomes

---

## ⚠️ Michael Action Required: Database Migration

### Step 1: Run SQL Migration

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/boycoadfvjcazqcslfxr/sql/new

Run each statement separately:

```sql
-- Add 'blocked' status to enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'blocked';
```

Then run:

```sql
-- Add new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_outcome TEXT;
```

Then verify:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('blocked_reason', 'review_outcome');

-- Check enum values  
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'task_status'::regtype 
ORDER BY enumsortorder;
```

### Step 2: Run Data Migration

After the columns are added, run the data migration script to restore missing assignees and checklist items:

```bash
cd pm-dashboard
node scripts/migrate-data.js
```

This will:
- Populate missing assignee_id from old export data
- Reassign "jarvis" tasks to "xandus"
- Add blocked_reason for tasks in blocked status
- Add review_outcome for tasks in review/done status
- Create any missing checklist items

---

## Testing Checklist

After migration:

- [ ] Open Kanban board - verify Blocked column appears (red)
- [ ] Drag a task to Blocked - verify prompt appears for reason
- [ ] Drag a task to Review - verify prompt appears for outcome
- [ ] Open a task not in Backlog - verify title/description are read-only
- [ ] Check assignee dropdown - verify only Michael and Xandus appear
- [ ] View Done tasks - verify review outcomes display
- [ ] Check task cards in Blocked column - verify blocked reason shows

---

## Deployment

The frontend changes will auto-deploy via Vercel after push to main.

**Commit:** 078b457
**Branch:** main
**GitHub:** https://github.com/michaeldimuro/pm-dashboard/commit/078b457
