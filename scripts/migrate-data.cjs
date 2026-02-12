/**
 * Data Migration Script for Mission Control
 * Fixes assignee UUIDs and restores checklist items
 * 
 * Run with: node scripts/migrate-data.cjs
 */

const fs = require('fs');
const path = require('path');

// Supabase REST API configuration
const SUPABASE_URL = 'https://boycoadfvjcazqcslfxr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveWNvYWRmdmpjYXpxY3NsZnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0MzYxNCwiZXhwIjoyMDg2NDE5NjE0fQ.mqu_oTnpgAyS-b7Fc0sZWmZArcEqBBFmj-uV2xZF_oI';

// CORRECT UUID MAPPING - these are the actual user IDs in the database
const ASSIGNEE_MAP = {
  'michael': 'ce844db6-780d-4bb2-8859-6e860b0c26c1',
  'xandus': 'e703aeed-3e46-413f-bc27-2fce063176bc',
  'jarvis': 'e703aeed-3e46-413f-bc27-2fce063176bc', // Reassign Jarvis tasks to Xandus
};

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'GET' ? 'return=representation' : 'return=minimal',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${SUPABASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${text}`);
  }
  
  if (method === 'GET') {
    return response.json();
  }
  
  return null;
}

async function migrate() {
  console.log('🚀 Starting data migration with CORRECT UUIDs...\n');
  
  // Read export file
  const exportPath = path.join(__dirname, '../../tasks-export.json');
  const oldExport = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  console.log(`📊 Loaded ${oldExport.tasks.length} tasks from export file\n`);
  
  // Get all current tasks from Supabase
  const currentTasks = await supabaseRequest('/rest/v1/tasks?select=id,title,status,assignee_id,blocked_reason,review_outcome');
  console.log(`📊 Found ${currentTasks.length} tasks in database\n`);
  
  // Create title-to-task mapping for matching
  const taskByTitle = {};
  for (const task of currentTasks) {
    taskByTitle[task.title] = task;
  }
  
  let assigneesUpdated = 0;
  let blockedReasonsUpdated = 0;
  let reviewOutcomesUpdated = 0;
  let checklistItemsCreated = 0;
  let tasksMissingFromDB = 0;
  
  // Process each task from old export
  for (const oldTask of oldExport.tasks) {
    const currentTask = taskByTitle[oldTask.title];
    
    if (!currentTask) {
      console.log(`⚠️  Task not found in DB: "${oldTask.title}"`);
      tasksMissingFromDB++;
      continue;
    }
    
    const updates = {};
    
    // Update assignee_id using CORRECT UUID mapping
    if (!currentTask.assignee_id && oldTask.assignee) {
      const mappedUUID = ASSIGNEE_MAP[oldTask.assignee.toLowerCase()];
      if (mappedUUID) {
        updates.assignee_id = mappedUUID;
        assigneesUpdated++;
      } else {
        console.log(`⚠️  Unknown assignee "${oldTask.assignee}" for task: "${oldTask.title}"`);
      }
    }
    
    // Update blocked_reason for blocked tasks
    if (oldTask.blockedReason && !currentTask.blocked_reason) {
      updates.blocked_reason = oldTask.blockedReason;
      blockedReasonsUpdated++;
    }
    
    // Update review_outcome from old 'outcome' field
    if (oldTask.outcome && !currentTask.review_outcome) {
      updates.review_outcome = oldTask.outcome;
      reviewOutcomesUpdated++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await supabaseRequest(
        `/rest/v1/tasks?id=eq.${currentTask.id}`,
        'PATCH',
        updates
      );
      const updatedFields = Object.keys(updates).join(', ');
      console.log(`✅ Updated task: "${oldTask.title}" - ${updatedFields}`);
    }
    
    // Create checklist items if any
    if (oldTask.checklist && oldTask.checklist.length > 0) {
      for (let i = 0; i < oldTask.checklist.length; i++) {
        const item = oldTask.checklist[i];
        
        // Check if checklist item already exists
        const existing = await supabaseRequest(
          `/rest/v1/task_checklist_items?task_id=eq.${currentTask.id}&text=eq.${encodeURIComponent(item.text)}&select=id`
        );
        
        if (existing.length === 0) {
          await supabaseRequest('/rest/v1/task_checklist_items', 'POST', {
            task_id: currentTask.id,
            text: item.text,
            done: item.done || false,
            order_index: i,
          });
          checklistItemsCreated++;
          console.log(`📝 Created checklist item for "${oldTask.title}": "${item.text.substring(0, 50)}..."`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY:');
  console.log('='.repeat(60));
  console.log(`   ✅ Assignees updated: ${assigneesUpdated}`);
  console.log(`   ✅ Blocked reasons updated: ${blockedReasonsUpdated}`);
  console.log(`   ✅ Review outcomes updated: ${reviewOutcomesUpdated}`);
  console.log(`   ✅ Checklist items created: ${checklistItemsCreated}`);
  console.log(`   ⚠️  Tasks missing from DB: ${tasksMissingFromDB}`);
  console.log('='.repeat(60));
  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
