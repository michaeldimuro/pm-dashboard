import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boycoadfvjcazqcslfxr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveWNvYWRmdmpjYXpxY3NsZnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NDM2MTQsImV4cCI6MjA4NjQxOTYxNH0._07KBoTlVop60cEVIUvTGBFbiQ_SNZwz_YDPJZDqqX0';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveWNvYWRmdmpjYXpxY3NsZnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg0MzYxNCwiZXhwIjoyMDg2NDE5NjE0fQ.mqu_oTnpgAyS-b7Fc0sZWmZArcEqBBFmj-uV2xZF_oI';

async function testQueries() {
  console.log('=== Testing Supabase Queries ===\n');
  
  // Test 1: Service role client (bypasses RLS)
  console.log('1. Testing with service role key (bypasses RLS)...');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  try {
    const { data, error, count } = await serviceClient
      .from('tasks')
      .select('id, title, status', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log('   ERROR:', error.message);
    } else {
      console.log('   SUCCESS! Found', count, 'total tasks');
      console.log('   Sample:', data?.slice(0,2).map(t => t.title));
    }
  } catch (e) {
    console.log('   EXCEPTION:', e.message);
  }
  
  // Test 2: Anon key client (uses RLS)
  console.log('\n2. Testing with anon key (RLS enforced)...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data, error } = await anonClient
      .from('tasks')
      .select('id, title')
      .limit(5);
    
    if (error) {
      console.log('   ERROR:', error.message, error.hint || '');
    } else {
      console.log('   SUCCESS! Got', data?.length, 'tasks (RLS filtered)');
    }
  } catch (e) {
    console.log('   EXCEPTION:', e.message);
  }
  
  // Test 3: Sign in and query
  console.log('\n3. Testing sign in + authenticated query...');
  try {
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'michael@dimuro.dev',
      password: 'test123' // This will likely fail but let's see the error
    });
    
    if (authError) {
      console.log('   Auth error:', authError.message);
      console.log('   (Expected if wrong password - the point is it connects)');
    } else {
      console.log('   Signed in as:', authData.user?.email);
      
      // Now try query
      const { data: tasks, error: taskError } = await anonClient
        .from('tasks')
        .select('id, title, status')
        .eq('user_id', authData.user?.id)
        .limit(5);
      
      if (taskError) {
        console.log('   Task query ERROR:', taskError.message, taskError.hint || '');
      } else {
        console.log('   Task query SUCCESS! Got', tasks?.length, 'tasks');
      }
    }
  } catch (e) {
    console.log('   EXCEPTION:', e.message);
  }
  
  console.log('\n=== Done ===');
}

testQueries();
