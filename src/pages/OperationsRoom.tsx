/**
 * Operations Room Page
 * Real-time agent activity visualization system
 * 
 * Main page displaying:
 * - Main agent (Xandus) status and progress
 * - Sub-agents grid with live status updates
 * - Task flow kanban board
 * - Live event feed
 * - Particle effects canvas for visual polish
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MainAgentPanel,
  SubAgentGrid,
  TaskFlowKanban,
  LiveFeed,
  ParticleEffectsCanvas,
} from '@/components/OperationsRoom';
import '../../src/styles/animations.css';

// Types
interface Agent {
  id: string;
  name: string;
  status: 'active' | 'working' | 'idle' | 'waiting';
  currentTask: string;
  taskId?: string;
  progress: number;
  startedAt: Date;
  lastActivityAt: Date;
  estimatedCompletion?: Date;
}

interface SubAgent {
  id: string;
  name: string;
  assignedTask: string;
  status: 'spawned' | 'active' | 'idle' | 'working' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  completedAt?: Date;
  summary?: string;
}

interface Task {
  id: string;
  title: string;
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
}

interface LiveEvent {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export const OperationsRoom = () => {
  const [mainAgent, setMainAgent] = useState<Agent>({
    id: 'agent:main:main',
    name: 'Xandus',
    status: 'working',
    currentTask: 'Real-time Operations Room Visualization',
    taskId: 'task-123',
    progress: 65,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActivityAt: new Date(Date.now() - 5 * 1000), // 5 seconds ago
    estimatedCompletion: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // 1.5 hours from now
  });

  const [subAgents, setSubAgents] = useState<SubAgent[]>([
    {
      id: 'agent:main:subagent:1',
      name: 'Architecture',
      assignedTask: 'Design System Architecture',
      status: 'completed',
      progress: 100,
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      summary: 'Completed comprehensive system architecture with WebSocket integration.',
    },
    {
      id: 'agent:main:subagent:2',
      name: 'Impl Animations',
      assignedTask: 'Implement Animations & Effects',
      status: 'working',
      progress: 75,
      startedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000),
    },
    {
      id: 'agent:main:subagent:3',
      name: 'WebSocket Setup',
      assignedTask: 'Configure Real-time Gateway',
      status: 'active',
      progress: 40,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 1 * 60 * 60 * 1000),
    },
  ]);

  const [tasks, setTasks] = useState({
    backlog: [
      { id: 'task-5', title: 'Performance Optimization', priority: 'medium' as const },
      { id: 'task-6', title: 'Database Indexes', priority: 'low' as const },
    ],
    todo: [
      { id: 'task-2', title: 'Create Particle System', priority: 'high' as const },
    ],
    inProgress: [
      { id: 'task-1', title: 'Implement Animations', priority: 'high' as const },
    ],
    review: [] as Task[],
    done: [
      { id: 'task-3', title: 'System Design', priority: 'high' as const },
      { id: 'task-4', title: 'WebSocket Setup', priority: 'high' as const },
      { id: 'task-7', title: 'Create Components', priority: 'high' as const },
      { id: 'task-8', title: 'Add Styling', priority: 'medium' as const },
    ],
  });

  const [events, setEvents] = useState<LiveEvent[]>([
    {
      id: 'evt-1',
      timestamp: new Date(Date.now() - 45 * 1000),
      type: 'agent.session.started',
      message: 'Xandus session started',
      severity: 'info',
    },
    {
      id: 'evt-2',
      timestamp: new Date(Date.now() - 40 * 1000),
      type: 'subagent.spawned',
      message: 'SubAgent [Architecture] spawned for design phase',
      severity: 'success',
    },
    {
      id: 'evt-3',
      timestamp: new Date(Date.now() - 35 * 1000),
      type: 'task.state_changed',
      message: 'Task moved from backlog to in_progress',
      severity: 'info',
    },
    {
      id: 'evt-4',
      timestamp: new Date(Date.now() - 30 * 1000),
      type: 'agent.status_updated',
      message: 'Xandus status changed to working',
      severity: 'info',
    },
    {
      id: 'evt-5',
      timestamp: new Date(Date.now() - 25 * 1000),
      type: 'subagent.spawned',
      message: 'SubAgent [Impl Animations] spawned',
      severity: 'success',
    },
    {
      id: 'evt-6',
      timestamp: new Date(Date.now() - 20 * 1000),
      type: 'agent.work_activity',
      message: 'Tool executed: write (completed in 2.3s)',
      severity: 'info',
    },
    {
      id: 'evt-7',
      timestamp: new Date(Date.now() - 15 * 1000),
      type: 'subagent.completed',
      message: 'SubAgent [Architecture] completed with deliverables',
      severity: 'success',
    },
    {
      id: 'evt-8',
      timestamp: new Date(Date.now() - 10 * 1000),
      type: 'agent.work_activity',
      message: 'Tool executed: exec (bash commands)',
      severity: 'info',
    },
    {
      id: 'evt-9',
      timestamp: new Date(),
      type: 'agent.status_updated',
      message: 'Progress updated: 65% complete',
      severity: 'info',
    },
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update main agent progress
      setMainAgent((prev) => ({
        ...prev,
        progress: Math.min(100, prev.progress + Math.random() * 5),
        lastActivityAt: new Date(),
      }));

      // Update sub-agent progress
      setSubAgents((prev) =>
        prev.map((agent) => {
          if (agent.status === 'working' && agent.progress < 100) {
            return {
              ...agent,
              progress: Math.min(100, agent.progress + Math.random() * 3),
            };
          }
          return agent;
        })
      );

      // Add random events
      if (Math.random() > 0.7) {
        const eventTypes = [
          'agent.work_activity',
          'task.state_changed',
          'agent.status_updated',
        ];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const messages = {
          'agent.work_activity': 'Tool executed: ' + ['write', 'exec', 'read'][Math.floor(Math.random() * 3)],
          'task.state_changed': 'Task moved to next column',
          'agent.status_updated': 'Agent status updated',
        };

        setEvents((prev) => [
          ...prev,
          {
            id: `evt-${Date.now()}`,
            timestamp: new Date(),
            type: eventType,
            message: messages[eventType as keyof typeof messages] || 'Event',
            severity: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)] as any,
          },
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="relative w-full h-screen bg-slate-950 text-slate-100 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Particle Effects Canvas */}
      <ParticleEffectsCanvas agents={[]} taskFlows={[]} isReconnecting={false} />

      {/* Main content */}
      <div className="relative z-20 h-full flex flex-col">
        {/* Header */}
        <motion.div
          className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm px-6 py-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              🚀 Operations Room
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time agent activity & task flow visualization
            </p>
          </div>
        </motion.div>

        {/* Main content grid */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Top section: Main agent + Status */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Main Agent Panel */}
              <div className="lg:col-span-2">
                <MainAgentPanel agent={mainAgent} />
              </div>

              {/* Status Indicators */}
              <motion.div
                className="border border-slate-700 rounded-lg p-4 bg-slate-900/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Status</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">WebSocket</p>
                    <motion.div
                      className="flex items-center gap-2"
                      animate={{
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-green-400">Connected</span>
                    </motion.div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Sessions</p>
                    <p className="text-sm text-cyan-300">{subAgents.length + 1} active</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Events/sec</p>
                    <p className="text-sm text-blue-300">~2.4</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Sub-agents grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-slate-300 mb-4">Sub-Agents</h2>
              <SubAgentGrid agents={subAgents} />
            </motion.div>

            {/* Task Flow + Live Feed */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Kanban */}
              <div className="lg:col-span-2 border border-slate-700 rounded-lg p-4 bg-slate-900/50 backdrop-blur-sm">
                <TaskFlowKanban taskFlow={{
                  backlog: tasks.filter((t: Task) => !t.priority || t.priority === 'low').map((t: Task) => ({
                    id: t.id,
                    title: t.title,
                    status: 'backlog' as const,
                    priority: 'low' as const,
                    assigneeId: t.assignee || '',
                  })),
                  todo: tasks.filter((t: Task) => t.priority === 'medium').map((t: Task) => ({
                    id: t.id,
                    title: t.title,
                    status: 'todo' as const,
                    priority: 'medium' as const,
                    assigneeId: t.assignee || '',
                  })),
                  inProgress: tasks.filter((t: Task) => t.priority === 'high').map((t: Task) => ({
                    id: t.id,
                    title: t.title,
                    status: 'in_progress' as const,
                    priority: 'high' as const,
                    assigneeId: t.assignee || '',
                  })),
                  review: [],
                  done: []
                }} />
              </div>

              {/* Live Feed */}
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50 backdrop-blur-sm flex flex-col h-96">
                <LiveFeed events={events.map((e: LiveEvent) => ({
                  id: e.id,
                  type: e.type,
                  timestamp: e.timestamp.toISOString(),
                  agent_id: 'agent:main:main',
                  payload: { message: e.message, severity: e.severity }
                }))} />
              </div>
            </motion.div>

            {/* Footer info */}
            <motion.div
              className="border-t border-slate-700 pt-4 pb-2 text-xs text-slate-500 flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span>Operations Room v1.0</span>
              <span>Last update: {new Date().toLocaleTimeString()}</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CSS animations import handled via ../styles/animations.css */}
    </motion.div>
  );
};

export default OperationsRoom;
