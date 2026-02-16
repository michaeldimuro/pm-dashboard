#!/usr/bin/env node

/**
 * Apply Operations Room Migration to Supabase
 * Connects directly to Supabase PostgreSQL and runs the migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase connection details
const DB_HOST = 'db.boycoadfvjcazqcslfxr.supabase.co';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Error: Missing SUPABASE_DB_PASSWORD environment variable');
  console.error('   This is the PostgreSQL password for your Supabase project');
  process.exit(1);
}

/**
 * Main function
 */
async function runMigration() {
  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  let client;

  try {
    console.log('🔗 Connecting to Supabase PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260216_operations_room.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📖 Loaded migration: 20260216_operations_room.sql`);
    console.log(`   Size: ${migrationSQL.length} bytes\n`);

    // Execute migration as a single transaction
    console.log('🔧 Executing migration...');
    await client.query('BEGIN;');

    const result = await client.query(migrationSQL);
    console.log(`   ✅ Migration executed`);

    await client.query('COMMIT;');
    console.log(`   ✅ Transaction committed\n`);

    // Verify tables exist
    console.log('✨ Verifying tables...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('agent_sessions', 'operations_events', 'agent_activities', 'subagent_registry')
      ORDER BY table_name;
    `);

    const tables = tableCheck.rows.map(r => r.table_name);
    console.log(`   📊 Tables created: ${tables.length}/4`);
    tables.forEach(t => console.log(`      • ${t}`));

    // Verify RLS policies
    console.log('\n🔐 Verifying RLS policies...');
    const policyCheck = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN ('agent_sessions', 'operations_events', 'agent_activities', 'subagent_registry')
      ORDER BY tablename, policyname;
    `);

    console.log(`   🛡️  Policies created: ${policyCheck.rows.length}`);
    const tableGroups = {};
    policyCheck.rows.forEach(row => {
      if (!tableGroups[row.tablename]) tableGroups[row.tablename] = [];
      tableGroups[row.tablename].push(row.policyname);
    });
    Object.entries(tableGroups).forEach(([table, policies]) => {
      console.log(`      • ${table}: ${policies.length} policies`);
    });

    console.log(`\n✅ Migration complete!\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.error(err.stack);
    if (client) {
      try {
        await client.query('ROLLBACK;');
        console.log('   Rolled back transaction');
      } catch (rollbackErr) {
        console.error(`   Could not rollback: ${rollbackErr.message}`);
      }
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(`\n❌ Unhandled error: ${err.message}`);
  process.exit(1);
});
