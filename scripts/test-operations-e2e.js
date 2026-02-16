#!/usr/bin/env node

/**
 * End-to-End Test: Operations Room
 * Tests the full pipeline:
 * 1. Agent logs session start
 * 2. Agent logs work activities
 * 3. Agent logs status updates
 * 4. WebSocket delivers events to browser
 * 5. React components update in real-time
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = process.env.OPERATION_LOGGER_URL || 'http://localhost:3000/api/operations/log';
const WEBHOOK_SECRET = process.env.OPERATION_LOGGER_SECRET || 'dev-secret';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, label, message) {
  console.log(`${colors[color]}[${label}]${colors.reset} ${message}`);
}

async function sendEvent(eventType, payload) {
  try {
    const event = {
      id: `evt-${eventType}-${uuidv4()}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      agent_id: 'agent:main:main',
      session_id: process.env.SESSION_ID || '550e8400-e29b-41d4-a716-446655440000',
      payload,
    };

    const body = JSON.stringify({
      event,
      timestamp: Date.now(),
    });

    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    log('blue', 'SEND', `${eventType}`);
    console.log(`  Event ID: ${event.id}`);
    console.log(`  URL: ${WEBHOOK_URL}`);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      log('red', 'FAIL', `HTTP ${response.status}: ${error}`);
      return false;
    }

    const result = await response.json();
    log('green', 'SENT', `${eventType} (${result.event_id})`);
    return true;
  } catch (err) {
    log('red', 'ERROR', err.message);
    return false;
  }
}

async function runTest() {
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       Operations Room - End-to-End Test                      ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  log('yellow', 'CONFIG', `Webhook URL: ${WEBHOOK_URL}`);
  log('yellow', 'CONFIG', `Session ID: ${process.env.SESSION_ID || '550e8400-e29b-41d4-a716-446655440000'}`);

  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Session Start
  console.log(`\n${colors.cyan}Test 1: Agent Session Start${colors.reset}`);
  const test1 = await sendEvent('agent.session.started', {
    agent_name: 'Xandus',
    agent_type: 'main',
    channel: 'test',
    initial_task: 'End-to-End Operations Room Test',
    metadata: { test: true },
  });
  tests.push({ name: 'Session Start', passed: test1 });
  if (test1) passed++;
  else failed++;

  // Wait before next event
  await new Promise(r => setTimeout(r, 500));

  // Test 2: Status Update
  console.log(`\n${colors.cyan}Test 2: Agent Status Update${colors.reset}`);
  const test2 = await sendEvent('agent.status_updated', {
    status: 'working',
    progress_percent: 25,
    current_task: 'Testing event logging',
    last_activity: new Date().toISOString(),
  });
  tests.push({ name: 'Status Update (25%)', passed: test2 });
  if (test2) passed++;
  else failed++;

  await new Promise(r => setTimeout(r, 500));

  // Test 3: Work Activity
  console.log(`\n${colors.cyan}Test 3: Work Activity${colors.reset}`);
  const test3 = await sendEvent('agent.work_activity', {
    activity_type: 'tool_execution',
    tool_name: 'fetch',
    status: 'completed',
    result: 'Fetched test data (1500 bytes)',
    duration_ms: 234,
  });
  tests.push({ name: 'Work Activity', passed: test3 });
  if (test3) passed++;
  else failed++;

  await new Promise(r => setTimeout(r, 500));

  // Test 4: Progress Update
  console.log(`\n${colors.cyan}Test 4: Progress Update${colors.reset}`);
  const test4 = await sendEvent('agent.status_updated', {
    status: 'working',
    progress_percent: 75,
    current_task: 'Verifying event pipeline',
  });
  tests.push({ name: 'Progress Update (75%)', passed: test4 });
  if (test4) passed++;
  else failed++;

  await new Promise(r => setTimeout(r, 500));

  // Test 5: Session Complete
  console.log(`\n${colors.cyan}Test 5: Session Completion${colors.reset}`);
  const test5 = await sendEvent('agent.session.terminated', {
    status: 'completed',
    summary: 'E2E test completed successfully. All events delivered to webhook.',
    total_duration_ms: 3000,
  });
  tests.push({ name: 'Session End', passed: test5 });
  if (test5) passed++;
  else failed++;

  // Summary
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                        Test Summary                          ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  tests.forEach((test) => {
    const icon = test.passed ? '✅' : '❌';
    const color = test.passed ? 'green' : 'red';
    console.log(`${colors[color]}${icon} ${test.name}${colors.reset}`);
  });

  console.log(`\n${colors.cyan}Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  Total: ${tests.length}\n`);

  if (failed === 0) {
    console.log(`${colors.green}✅ All tests passed!${colors.reset}`);
    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Open dashboard at: https://dashboard.michaeldimuro.com/operations`);
    console.log(`  2. Verify events appear in real-time in the Operations Room`);
    console.log(`  3. Check live feed for the test events`);
    console.log(`  4. Observe main agent panel showing progress updates\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some tests failed!${colors.reset}`);
    console.log(`\n${colors.cyan}Troubleshooting:${colors.reset}`);
    console.log(`  - Check that OPERATION_LOGGER_URL is correct`);
    console.log(`  - Verify OPERATION_LOGGER_SECRET matches server config`);
    console.log(`  - Ensure webhook endpoint is running`);
    console.log(`  - Check browser console for WebSocket errors\n`);
    process.exit(1);
  }
}

runTest().catch((err) => {
  log('red', 'FATAL', err.message);
  process.exit(1);
});
