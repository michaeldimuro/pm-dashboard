const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'hbadziugeagzdfbcacly.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '1LjB3plJj3l5lA5M',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 30000,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000
});

async function run() {
  try {
    console.log('Checking migration status...');
    const checkQuery = `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'task_comments'
    );`;
    
    const result = await pool.query(checkQuery);
    const migrationExists = result.rows[0].exists;
    
    if (migrationExists) {
      console.log('✅ Migration already applied. task_comments table exists.');
      process.exit(0);
    } else {
      console.log('❌ Migration NOT applied. Running now...');
      const sql = fs.readFileSync('./supabase/migrations/20260211_add_comments_and_checklists.sql', 'utf8');
      
      await pool.query(sql);
      console.log('✅ Migration executed successfully.');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
