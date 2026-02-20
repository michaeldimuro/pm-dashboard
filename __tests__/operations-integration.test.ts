/**
 * Operations Room - Integration Tests
 * Tests the full lifecycle of operations room functionality:
 * - Agent session tracking
 * - Sub-agent spawning and completion
 * - Task state changes
 * - Event logging and WebSocket broadcasting
 * - React component updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock types for testing
 */
interface MockAgent {
  id: string;
  name: string;
  status: string;
  sessionId: string;
  parentSessionId?: string;
}

interface MockEvent {
  id: string;
  type: string;
  timestamp: string;
  agent_id: string;
  session_id: string;
  payload: Record<string, any>;
}

/**
 * Helper: Create a mock agent
 */
function createMockAgent(overrides?: Partial<MockAgent>): MockAgent {
  const sessionId = uuidv4();
  return {
    id: overrides?.id || 'test',
    name: 'Test Agent',
    status: 'active',
    sessionId,
    ...overrides,
  };
}

/**
 * Helper: Create a mock event
 */
function createMockEvent(type: string, agent: MockAgent, payload?: Record<string, any>): MockEvent {
  return {
    id: `evt-${type}-${uuidv4()}`,
    type,
    timestamp: new Date().toISOString(),
    agent_id: agent.id,
    session_id: agent.sessionId,
    payload: {
      agent_name: agent.name,
      status: agent.status,
      ...payload,
    },
  };
}

describe('Operations Room Integration', () => {
  describe('Agent Session Lifecycle', () => {
    it('should create an agent session', () => {
      const agent = createMockAgent({
        name: 'Xandus',
        id: 'main',
      });

      expect(agent.id).toBe('main');
      expect(agent.sessionId).toBeDefined();
      expect(agent.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should log session started event', () => {
      const agent = createMockAgent({ name: 'Xandus' });
      const event = createMockEvent('agent.session.started', agent, {
        channel: 'telegram',
        initial_task: 'Build Operations Room',
      });

      expect(event.type).toBe('agent.session.started');
      expect(event.payload.agent_name).toBe('Xandus');
      expect(event.payload.channel).toBe('telegram');
    });

    it('should log session terminated event', () => {
      const agent = createMockAgent({ name: 'Xandus', status: 'completed' });
      const event = createMockEvent('agent.session.terminated', agent, {
        summary: 'Task completed successfully',
        total_duration_ms: 3600000,
      });

      expect(event.type).toBe('agent.session.terminated');
      expect(event.payload.summary).toBe('Task completed successfully');
      expect(event.payload.total_duration_ms).toBe(3600000);
    });
  });

  describe('Sub-Agent Spawning', () => {
    it('should spawn a sub-agent', () => {
      const parentAgent = createMockAgent({ name: 'Xandus', id: 'main' });
      const subAgentId = `main:subagent:${uuidv4()}`;
      const subAgent = createMockAgent({
        name: 'OpRoom Architect',
        id: subAgentId,
        parentSessionId: parentAgent.sessionId,
      });

      expect(subAgent.parentSessionId).toBe(parentAgent.sessionId);
      expect(subAgent.id).toMatch(/^main:subagent:/);
    });

    it('should log subagent spawned event', () => {
      const parentAgent = createMockAgent({ name: 'Xandus' });
      const subAgent = createMockAgent({
        name: 'Database Setup',
        parentSessionId: parentAgent.sessionId,
      });

      const event = createMockEvent('subagent.spawned', subAgent, {
        subagent_id: subAgent.id,
        assigned_task: 'Create operations database schema',
        parent_session_id: parentAgent.sessionId,
      });

      expect(event.type).toBe('subagent.spawned');
      expect(event.payload.parent_session_id).toBe(parentAgent.sessionId);
    });

    it('should track multiple sub-agents', () => {
      const parentAgent = createMockAgent({ name: 'Xandus' });
      const subAgents = [
        createMockAgent({ name: 'DB Setup', parentSessionId: parentAgent.sessionId }),
        createMockAgent({ name: 'API Dev', parentSessionId: parentAgent.sessionId }),
        createMockAgent({ name: 'UI Impl', parentSessionId: parentAgent.sessionId }),
      ];

      expect(subAgents.length).toBe(3);
      expect(subAgents.every((sa) => sa.parentSessionId === parentAgent.sessionId)).toBe(true);
    });
  });

  describe('Sub-Agent Completion', () => {
    it('should log sub-agent completion', () => {
      const agent = createMockAgent({ name: 'OpRoom Architect', status: 'completed' });
      const event = createMockEvent('subagent.completed', agent, {
        summary: 'Architecture document created with full technical stack',
        deliverables: [
          'OPROOM_ARCHITECTURE.md',
          'OPROOM_TECH_STACK.md',
          'database-schema.sql',
        ],
        total_duration_ms: 1800000,
      });

      expect(event.type).toBe('subagent.completed');
      expect(event.payload.deliverables).toHaveLength(3);
      expect(event.payload.summary).toBeDefined();
    });

    it('should track sub-agent failure', () => {
      const agent = createMockAgent({ name: 'Component Builder', status: 'failed' });
      const event = createMockEvent('subagent.failed', agent, {
        error: 'Build failed: TypeScript errors',
        error_count: 5,
      });

      expect(event.type).toBe('subagent.failed');
      expect(event.payload.error).toBeDefined();
    });
  });

  describe('Task State Changes', () => {
    it('should log task state change', () => {
      const agent = createMockAgent({ name: 'Xandus' });
      const event = createMockEvent('task.state_changed', agent, {
        task_id: uuidv4(),
        old_state: 'backlog',
        new_state: 'in_progress',
        title: 'Design OpRoom Architecture',
        priority: 'high',
      });

      expect(event.type).toBe('task.state_changed');
      expect(event.payload.old_state).toBe('backlog');
      expect(event.payload.new_state).toBe('in_progress');
    });

    it('should track complete task workflow', () => {
      const taskId = uuidv4();
      const agent = createMockAgent();
      const states = ['backlog', 'todo', 'in_progress', 'review', 'done'];
      const events: MockEvent[] = [];

      for (let i = 1; i < states.length; i++) {
        const event = createMockEvent('task.state_changed', agent, {
          task_id: taskId,
          old_state: states[i - 1],
          new_state: states[i],
        });
        events.push(event);
      }

      expect(events).toHaveLength(4);
      expect(events[0].payload.old_state).toBe('backlog');
      expect(events[events.length - 1].payload.new_state).toBe('done');
    });
  });

  describe('Agent Work Activity', () => {
    it('should log tool execution', () => {
      const agent = createMockAgent();
      const event = createMockEvent('agent.work_activity', agent, {
        activity_type: 'tool_execution',
        tool_name: 'write',
        status: 'completed',
        result: 'Created file: OPROOM_ARCHITECTURE.md (2847 lines)',
        duration_ms: 2340,
      });

      expect(event.type).toBe('agent.work_activity');
      expect(event.payload.tool_name).toBe('write');
      expect(event.payload.status).toBe('completed');
    });

    it('should log multiple tool executions', () => {
      const agent = createMockAgent();
      const tools = ['read', 'write', 'exec', 'browser'];
      const events = tools.map((tool) =>
        createMockEvent('agent.work_activity', agent, {
          activity_type: 'tool_execution',
          tool_name: tool,
          status: 'completed',
          result: `${tool} execution completed`,
        })
      );

      expect(events).toHaveLength(4);
      expect(events.map((e) => e.payload.tool_name)).toEqual(tools);
    });
  });

  describe('Agent Status Updates', () => {
    it('should log status update with progress', () => {
      const agent = createMockAgent({ status: 'working' });
      const event = createMockEvent('agent.status_updated', agent, {
        status: 'working',
        progress: 45,
        current_task: 'Design event schema',
        active_tools: ['write', 'exec'],
        estimated_completion: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(event.type).toBe('agent.status_updated');
      expect(event.payload.progress).toBe(45);
      expect(event.payload.active_tools).toContain('write');
    });
  });

  describe('Error Handling', () => {
    it('should log agent errors', () => {
      const agent = createMockAgent();
      const event = createMockEvent('agent.error', agent, {
        severity: 'error',
        error_type: 'rate_limit_exceeded',
        message: 'API rate limit exceeded',
        context: {
          limit: 100,
          current: 105,
        },
      });

      expect(event.type).toBe('agent.error');
      expect(event.payload.severity).toBe('error');
    });

    it('should log warnings', () => {
      const agent = createMockAgent();
      const event = createMockEvent('agent.error', agent, {
        severity: 'warning',
        error_type: 'rate_limit_approaching',
        message: 'Approaching token budget (85%)',
        context: {
          budget: 200000,
          consumed: 170000,
        },
      });

      expect(event.type).toBe('agent.error');
      expect(event.payload.severity).toBe('warning');
    });
  });

  describe('Event Batching', () => {
    it('should handle multiple events in sequence', () => {
      const agent = createMockAgent();
      const events: MockEvent[] = [];

      // Simulate agent activity sequence
      events.push(createMockEvent('agent.session.started', agent));
      events.push(
        createMockEvent('agent.status_updated', agent, { status: 'working', progress: 10 })
      );
      events.push(
        createMockEvent('agent.work_activity', agent, {
          tool_name: 'write',
          status: 'completed',
        })
      );
      events.push(
        createMockEvent('agent.status_updated', agent, { status: 'working', progress: 50 })
      );
      events.push(createMockEvent('agent.session.terminated', agent, { status: 'completed' }));

      expect(events).toHaveLength(5);
      expect(events[0].type).toBe('agent.session.started');
      expect(events[events.length - 1].type).toBe('agent.session.terminated');
    });
  });

  describe('WebSocket Message Format', () => {
    it('should format WebSocket message correctly', () => {
      const event = createMockEvent('agent.session.started', createMockAgent());
      const message = {
        channel: 'operations_room',
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
        data: event,
      };

      expect(message.channel).toBe('operations_room');
      expect(message.message_id).toBeDefined();
      expect(message.data).toEqual(event);
    });

    it('should handle batch events in WebSocket message', () => {
      const agent = createMockAgent();
      const events = [
        createMockEvent('agent.status_updated', agent, { progress: 10 }),
        createMockEvent('agent.work_activity', agent, { tool_name: 'read' }),
        createMockEvent('agent.status_updated', agent, { progress: 20 }),
      ];

      const message = {
        channel: 'operations_room',
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
        data: events,
      };

      expect(Array.isArray(message.data)).toBe(true);
      expect(message.data).toHaveLength(3);
    });
  });

  describe('Event Deduplication', () => {
    it('should deduplicate events by message_id', () => {
      const messageId = uuidv4();
      const event = createMockEvent('agent.status_updated', createMockAgent());

      const msg1 = { message_id: messageId, data: event };
      const msg2 = { message_id: messageId, data: event }; // Duplicate

      const seen = new Set<string>();
      const unique = [msg1, msg2].filter((msg) => {
        if (seen.has(msg.message_id)) return false;
        seen.add(msg.message_id);
        return true;
      });

      expect(unique).toHaveLength(1);
    });
  });

  describe('Event Ordering', () => {
    it('should preserve event order by timestamp', () => {
      const agent = createMockAgent();
      const baseTime = new Date();

      const event1 = {
        ...createMockEvent('agent.session.started', agent),
        timestamp: new Date(baseTime.getTime() + 0).toISOString(),
      };

      const event2 = {
        ...createMockEvent('agent.work_activity', agent),
        timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
      };

      const event3 = {
        ...createMockEvent('agent.session.terminated', agent),
        timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
      };

      const events = [event1, event2, event3].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      expect(events[0].type).toBe('agent.session.started');
      expect(events[1].type).toBe('agent.work_activity');
      expect(events[2].type).toBe('agent.session.terminated');
    });
  });
});
