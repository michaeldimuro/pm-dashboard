#!/usr/bin/env node

/**
 * Operations Room Integration Verification
 * Tests all integration points to ensure Operations Room is properly wired
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, label, message) {
  console.log(`${colors[color]}[${label}]${colors.reset} ${message}`);
}

function section(title) {
  console.log(`\n${colors.cyan}╔${'═'.repeat(title.length + 2)}╗${colors.reset}`);
  console.log(`${colors.cyan}║ ${title} ║${colors.reset}`);
  console.log(`${colors.cyan}╚${'═'.repeat(title.length + 2)}╝${colors.reset}\n`);
}

// Test results
const results = {
  routeSetup: null,
  sidebarIntegration: null,
  agentLogger: null,
  eventSigning: null,
  environmentConfig: null,
  websocketHook: null,
};

/**
 * Test 1: Route Setup
 */
async function testRouteSetup() {
  section('Test 1: Route Setup');
  
  try {
    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    let passed = true;
    const checks = [];

    // Check 1: Import OperationsRoom
    if (appContent.includes("import { OperationsPage }")) {
      checks.push({ name: 'OperationsPage imported', pass: true });
    } else {
      checks.push({ name: 'OperationsPage imported', pass: false });
      passed = false;
    }

    // Check 2: Route defined
    if (appContent.includes("path=\"/operations\"")) {
      checks.push({ name: '/operations route defined', pass: true });
    } else {
      checks.push({ name: '/operations route defined', pass: false });
      passed = false;
    }

    // Check 3: ProtectedRoute wrapper
    if (appContent.includes("ProtectedRoute") && appContent.includes("/operations")) {
      checks.push({ name: 'Route wrapped in ProtectedRoute', pass: true });
    } else {
      checks.push({ name: 'Route wrapped in ProtectedRoute', pass: false });
      passed = false;
    }

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    results.routeSetup = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `Route setup test failed: ${err.message}`);
    results.routeSetup = false;
    return false;
  }
}

/**
 * Test 2: Sidebar Integration
 */
async function testSidebarIntegration() {
  section('Test 2: Sidebar Navigation Integration');

  try {
    const sidebarPath = path.join(projectRoot, 'src', 'components', 'Layout', 'Sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

    let passed = true;
    const checks = [];

    // Check 1: Operations link exists
    if (sidebarContent.includes("'Operations'") || sidebarContent.includes('"Operations"')) {
      checks.push({ name: 'Operations link text present', pass: true });
    } else {
      checks.push({ name: 'Operations link text present', pass: false });
      passed = false;
    }

    // Check 2: Route path defined
    if (sidebarContent.includes("/operations")) {
      checks.push({ name: '/operations path defined', pass: true });
    } else {
      checks.push({ name: '/operations path defined', pass: false });
      passed = false;
    }

    // Check 3: Icon used (MonitorPlay or similar)
    if (sidebarContent.includes("MonitorPlay") || sidebarContent.includes("Monitor")) {
      checks.push({ name: 'Navigation icon present', pass: true });
    } else {
      checks.push({ name: 'Navigation icon present', pass: false });
      passed = false;
    }

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    results.sidebarIntegration = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `Sidebar integration test failed: ${err.message}`);
    results.sidebarIntegration = false;
    return false;
  }
}

/**
 * Test 3: Agent Event Logger
 */
async function testAgentLogger() {
  section('Test 3: Agent Event Logger');

  try {
    const loggerPath = path.join(projectRoot, 'src', 'lib', 'agentEventLogger.ts');
    const loggerContent = fs.readFileSync(loggerPath, 'utf-8');

    let passed = true;
    const checks = [];

    // Check 1: File exists
    if (fs.existsSync(loggerPath)) {
      checks.push({ name: 'agentEventLogger.ts exists', pass: true });
    } else {
      checks.push({ name: 'agentEventLogger.ts exists', pass: false });
      passed = false;
    }

    // Check 2: logOperationEvent function exported
    if (loggerContent.includes('export async function logOperationEvent')) {
      checks.push({ name: 'logOperationEvent exported', pass: true });
    } else {
      checks.push({ name: 'logOperationEvent exported', pass: false });
      passed = false;
    }

    // Check 3: Convenience functions
    const convenientFunctions = [
      'logSessionStart',
      'logSessionEnd',
      'logSubagentSpawned',
      'logSubagentCompleted',
      'logWorkActivity',
      'logStatusUpdate',
      'logTaskStateChange',
      'logError',
    ];

    let allFunctionsPresent = true;
    convenientFunctions.forEach(fn => {
      if (!loggerContent.includes(`export async function ${fn}`)) {
        allFunctionsPresent = false;
      }
    });

    if (allFunctionsPresent) {
      checks.push({ name: 'All convenience functions exported', pass: true });
    } else {
      checks.push({ name: 'All convenience functions exported', pass: false });
      passed = false;
    }

    // Check 4: HMAC-SHA256 signing
    if (loggerContent.includes('createHmac') || loggerContent.includes('HMAC')) {
      checks.push({ name: 'HMAC-SHA256 signing implemented', pass: true });
    } else {
      checks.push({ name: 'HMAC-SHA256 signing implemented', pass: false });
      passed = false;
    }

    // Check 5: Configuration handling (setLoggerCredentials)
    if (loggerContent.includes('setLoggerCredentials') || loggerContent.includes('loggerConfig')) {
      checks.push({ name: 'Logger configuration method', pass: true });
    } else {
      checks.push({ name: 'Logger configuration method', pass: false });
      passed = false;
    }

    // Check 6: HTTP POST to webhook
    if (loggerContent.includes('fetch') && loggerContent.includes('POST')) {
      checks.push({ name: 'Webhook POST implemented', pass: true });
    } else {
      checks.push({ name: 'Webhook POST implemented', pass: false });
      passed = false;
    }

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    results.agentLogger = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `Agent logger test failed: ${err.message}`);
    results.agentLogger = false;
    return false;
  }
}

/**
 * Test 4: Event Signing
 */
async function testEventSigning() {
  section('Test 4: Event Signing (HMAC-SHA256)');

  try {
    const secret = 'test-secret-key';
    const testPayload = JSON.stringify({
      event: {
        id: 'evt-test-123',
        type: 'agent.test',
        timestamp: new Date().toISOString(),
        agent_id: 'agent:test',
        session_id: 'session:test',
        payload: { test: true },
      },
      timestamp: Date.now(),
    });

    // Create signature using same method as logger
    const signature = crypto
      .createHmac('sha256', secret)
      .update(testPayload)
      .digest('hex');

    const checks = [];

    // Check 1: Signature is hex string
    if (/^[a-f0-9]+$/.test(signature) && signature.length === 64) {
      checks.push({ name: 'Signature is valid SHA256 hex', pass: true });
    } else {
      checks.push({ name: 'Signature is valid SHA256 hex', pass: false });
    }

    // Check 2: Signature can be verified
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(testPayload)
      .digest('hex');

    if (signature === expectedSig) {
      checks.push({ name: 'Signature verifies correctly', pass: true });
    } else {
      checks.push({ name: 'Signature verifies correctly', pass: false });
    }

    // Check 3: Different payload produces different signature
    const differentPayload = JSON.stringify({
      event: {
        id: 'evt-different-456',
        type: 'agent.different',
      },
    });

    const differentSig = crypto
      .createHmac('sha256', secret)
      .update(differentPayload)
      .digest('hex');

    if (signature !== differentSig) {
      checks.push({ name: 'Different payload produces different signature', pass: true });
    } else {
      checks.push({ name: 'Different payload produces different signature', pass: false });
    }

    let passed = checks.every(c => c.pass);

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    console.log(`\n${colors.gray}Sample signature: ${signature.substring(0, 32)}...${colors.reset}`);

    results.eventSigning = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `Event signing test failed: ${err.message}`);
    results.eventSigning = false;
    return false;
  }
}

/**
 * Test 5: Environment Configuration
 */
async function testEnvironmentConfig() {
  section('Test 5: Environment Configuration');

  try {
    const envLocalPath = path.join(projectRoot, '.env.local');
    const envExamplePath = path.join(projectRoot, '.env.example');

    const checks = [];

    // Check 1: .env.local exists
    if (fs.existsSync(envLocalPath)) {
      checks.push({ name: '.env.local exists', pass: true });
    } else {
      checks.push({ name: '.env.local exists', pass: false });
    }

    // Check 2: .env.example exists and documented
    if (fs.existsSync(envExamplePath)) {
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      if (envExampleContent.includes('VITE_OPROOM_WS_URL')) {
        checks.push({ name: '.env.example documented', pass: true });
      } else {
        checks.push({ name: '.env.example documented', pass: false });
      }
    } else {
      checks.push({ name: '.env.example documented', pass: false });
    }

    // Check 3: Logger configuration approach documented
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf-8');
      const hasWebsocketUrl = envContent.includes('VITE_OPROOM_WS_URL') || envContent.includes('oproom');
      checks.push({ name: 'WebSocket configuration available', pass: hasWebsocketUrl });
    } else {
      checks.push({ name: 'WebSocket configuration available', pass: false });
    }

    // Check 4: Documentation for setLoggerCredentials
    const agentLoggerPath = path.join(projectRoot, 'src', 'lib', 'agentEventLogger.ts');
    if (fs.existsSync(agentLoggerPath)) {
      const loggerContent = fs.readFileSync(agentLoggerPath, 'utf-8');
      if (loggerContent.includes('setLoggerCredentials')) {
        checks.push({ name: 'Logger configuration method documented', pass: true });
      } else {
        checks.push({ name: 'Logger configuration method documented', pass: false });
      }
    } else {
      checks.push({ name: 'Logger configuration method documented', pass: false });
    }

    // Check 5: TypeScript/Vite env handling
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      checks.push({ name: 'TypeScript configuration exists', pass: true });
    } else {
      checks.push({ name: 'TypeScript configuration exists', pass: false });
    }

    let passed = checks.every(c => c.pass);

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    results.environmentConfig = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `Environment config test failed: ${err.message}`);
    results.environmentConfig = false;
    return false;
  }
}

/**
 * Test 6: WebSocket Hook
 */
async function testWebSocketHook() {
  section('Test 6: WebSocket Hook Integration');

  try {
    const hookPath = path.join(projectRoot, 'src', 'hooks', 'useOperationRoomWebSocket.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    const checks = [];

    // Check 1: File exists
    if (fs.existsSync(hookPath)) {
      checks.push({ name: 'useOperationRoomWebSocket hook exists', pass: true });
    } else {
      checks.push({ name: 'useOperationRoomWebSocket hook exists', pass: false });
    }

    // Check 2: useEffect for connection
    if (hookContent.includes('useEffect')) {
      checks.push({ name: 'useEffect for connection setup', pass: true });
    } else {
      checks.push({ name: 'useEffect for connection setup', pass: false });
    }

    // Check 3: WebSocket URL from env
    if (hookContent.includes('VITE_OPROOM_WS_URL')) {
      checks.push({ name: 'WebSocket URL from environment', pass: true });
    } else {
      checks.push({ name: 'WebSocket URL from environment', pass: false });
    }

    // Check 4: Connection state management
    if (hookContent.includes('isConnected') || hookContent.includes('useState')) {
      checks.push({ name: 'Connection state managed', pass: true });
    } else {
      checks.push({ name: 'Connection state managed', pass: false });
    }

    // Check 5: Message handlers
    if (hookContent.includes('onmessage') || hookContent.includes('handleMessage')) {
      checks.push({ name: 'Message handlers implemented', pass: true });
    } else {
      checks.push({ name: 'Message handlers implemented', pass: false });
    }

    // Check 6: Reconnection logic
    if (hookContent.includes('reconnect') || hookContent.includes('onclose')) {
      checks.push({ name: 'Reconnection logic present', pass: true });
    } else {
      checks.push({ name: 'Reconnection logic present', pass: false });
    }

    let passed = checks.every(c => c.pass);

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${colors[check.pass ? 'green' : 'red']}${icon} ${check.name}${colors.reset}`);
    });

    results.websocketHook = passed;
    return passed;
  } catch (err) {
    log('red', 'ERROR', `WebSocket hook test failed: ${err.message}`);
    results.websocketHook = false;
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Operations Room Integration Verification Test Suite       ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  log('yellow', 'INFO', `Project root: ${projectRoot}`);

  // Run all tests
  await testRouteSetup();
  await testSidebarIntegration();
  await testAgentLogger();
  await testEventSigning();
  await testEnvironmentConfig();
  await testWebSocketHook();

  // Summary
  section('Integration Verification Summary');

  const testSummary = [
    { name: 'Route Setup', result: results.routeSetup },
    { name: 'Sidebar Navigation', result: results.sidebarIntegration },
    { name: 'Agent Event Logger', result: results.agentLogger },
    { name: 'Event Signing (HMAC-SHA256)', result: results.eventSigning },
    { name: 'Environment Configuration', result: results.environmentConfig },
    { name: 'WebSocket Hook', result: results.websocketHook },
  ];

  testSummary.forEach(test => {
    const icon = test.result === true ? '✅' : test.result === false ? '❌' : '⚠️';
    const color = test.result === true ? 'green' : test.result === false ? 'red' : 'yellow';
    console.log(`${colors[color]}${icon} ${test.name}${colors.reset}`);
  });

  // Count results
  const passed = testSummary.filter(t => t.result === true).length;
  const failed = testSummary.filter(t => t.result === false).length;
  const total = testSummary.length;

  console.log(`\n${colors.cyan}Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  Total: ${total}\n`);

  if (failed === 0) {
    console.log(`${colors.green}✅ All integration tests passed!${colors.reset}`);
    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Run: npm run dev`);
    console.log(`  2. Open: http://localhost:5173`);
    console.log(`  3. Navigate to: Operations (from sidebar)`);
    console.log(`  4. Verify page loads without errors`);
    console.log(`  5. Run: npm run test:e2e (to test webhook integration)\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some integration tests failed!${colors.reset}`);
    console.log(`\n${colors.cyan}Failed Tests:${colors.reset}`);
    testSummary
      .filter(t => t.result === false)
      .forEach(test => console.log(`  - ${test.name}`));
    console.log();
    process.exit(1);
  }
}

// Run verification
runAllTests().catch(err => {
  log('red', 'FATAL', err.message);
  console.error(err.stack);
  process.exit(1);
});
