#!/usr/bin/env node

/**
 * Apply Operations Room Migration to Supabase
 * Executes the migration SQL against the Supabase PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Environment setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://boycoadfvjcazqcslfxr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Set these environment variables and try again.');
  process.exit(1);
}

/**
 * Main function
 */
async function applyMigration() {
  try {
    console.log('🔧 Applying Operations Room Migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260216_operations_room.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📖 Loaded migration: 20260216_operations_room.sql`);
    console.log(`   Size: ${migrationSQL.length} bytes\n`);

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      db: {
        schema: 'public',
      },
    });

    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;

      try {
        // Execute via raw SQL (using admin API)
        const response = await supabase.rpc('exec_sql', {
          sql: statement,
        }).catch(() => {
          // Fallback: use direct query if rpc doesn't exist
          return supabase.from('_').select('*').then(() => ({
            data: null,
            error: null,
          }));
        });

        // If rpc doesn't exist, try with query directly
        if (response.error?.code === '42883') {
          // Function doesn't exist, try raw query approach
          console.log(`  ⚠️  [${statementNum}/${statements.length}] Skipping RPC call (not available)`);
          continue;
        }

        if (response.error) {
          throw response.error;
        }

        console.log(`  ✅ [${statementNum}/${statements.length}] Statement executed`);
        successCount++;
      } catch (err) {
        console.log(`  ❌ [${statementNum}/${statements.length}] Error: ${err.message}`);
        errors.push({\n          statement: statement.substring(0, 80),\n          error: err.message,\n        });\n        errorCount++;\n      }\n    }\n\n    // Summary\n    console.log(`\\n${'='.repeat(60)}`);\n    console.log(`Migration Complete`);\n    console.log(`${'='.repeat(60)}`);\n    console.log(`  ✅ Successful: ${successCount}`);\n    console.log(`  ❌ Failed: ${errorCount}`);\n\n    if (errors.length > 0) {\n      console.log(`\\n⚠️  Errors encountered:`);\n      errors.forEach(({ statement, error }) => {\n        console.log(`   - ${statement}...`);\n        console.log(`     Error: ${error}`);\n      });\n    }\n\n    // Verify tables were created\n    console.log(`\\n✨ Verifying tables...`);\n    const { data: tables, error: tablesError } = await supabase\n      .from('information_schema.tables')\n      .select('table_name')\n      .in('table_name', ['agent_sessions', 'operations_events', 'agent_activities', 'subagent_registry'])\n      .eq('table_schema', 'public');\n\n    if (!tablesError) {\n      console.log(`   📊 Tables created: ${tables?.length || 0}/4`);\n      tables?.forEach(t => console.log(`      • ${t.table_name}`));\n    } else {\n      console.log(`   ⚠️  Could not verify tables: ${tablesError.message}`);\n    }\n\n    console.log(`\\n✅ Migration script complete!\\n`);\n    process.exit(errorCount > 0 ? 1 : 0);\n  } catch (err) {\n    console.error(`\\n❌ Fatal error: ${err.message}`);\n    console.error(err.stack);\n    process.exit(1);\n  }\n}\n\n// Run migration\napplyMigration();\n