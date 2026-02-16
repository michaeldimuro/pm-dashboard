/**
 * Operations Room - Core TypeScript Types
 * Real-time agent activity visualization system
 */

export type AgentStatus = 'active' | 'idle' | 'working' | 'waiting';
export type SubAgentStatus = 'spawned' | 'active' | 'idle' | 'working' | 'completed' | 'failed';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EventType = 
  | 'agent.session.started'
  | 'agent.session.terminated'
  | 'agent.status_updated'
  | 'agent.work_activity'
  | 'agent.error'
  | 'subagent.spawned'
  | 'subagent.completed'
  | 'subagent.failed'
  | 'task.state_changed'
  | 'task.created'
  | 'task.updated'
  | 'system.connected'
  | 'system.disconnected'
  | string;

/**
 * Core Agent Interface
 */
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  currentTask: string;
  progress: number; // 0-100
  startedAt: Date;
  lastActivityAt: Date;
  estimatedCompletion?: Date;
}

/**
 * Sub-Agent Interface (extends Agent)
 */
export interface SubAgent extends Agent {
  status: SubAgentStatus;
  parentSessionId: string;
  sessionId: string;
  completedAt?: Date;
  summary?: string;
  deliverables?: string[];
}

/**
 * Task Interface
 */
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

/**
 * Task Flow - Organized by status for kanban
 */
export interface TaskFlow {
  backlog: Task[];
  todo: Task[];
  inProgress: Task[];
  review: Task[];
  done: Task[];
}

/**
 * Operation Event - Core immutable event structure
 */
export interface OperationEvent {
  id: string; // "evt-type-{uuid}"
  type: EventType;
  timestamp: string; // ISO8601
  agent_id: string;
  session_id?: string;
  payload: Record<string, any>;
  triggered_by?: 'user' | 'system' | 'webhook' | 'timer';
  correlation_id?: string;
}

/**
 * WebSocket Message - Format for browser ← server
 */
export interface WebSocketMessage {
  channel: 'operations_room' | 'task_flow' | 'live_feed' | 'system';
  message_id: string; // UUID for deduplication
  timestamp: string;
  data: OperationEvent | OperationEvent[];
}

/**
 * Main Operations Room State
 */
export interface OperationsRoomState {
  // Main agent
  mainAgent: Agent | null;
  
  // Sub-agents mapped by agent_id
  subAgents: Record<string, SubAgent>;
  
  // Task flow organized by status
  taskFlow: TaskFlow;
  
  // Live event feed (last 50 events)
  liveFeed: OperationEvent[];
  
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Metadata
  sessionStartedAt?: Date;
  lastEventAt?: Date;
  unseenEventCount: number;
  
  // Actions
  addEvent: (event: OperationEvent) => void;
  updateMainAgent: (updates: Partial<Agent>) => void;
  addSubAgent: (agent: SubAgent) => void;
  updateSubAgent: (id: string, updates: Partial<SubAgent>) => void;
  updateTaskFlow: (taskFlow: TaskFlow) => void;
  setConnected: (status: boolean, error?: string | null) => void;
  clearEvents: () => void;
  removeSubAgent: (id: string) => void;
}

/**
 * WebSocket Connection State
 */
export interface WebSocketConnectionState {
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnectedAt?: Date;
  messageCount: number;
}

/**
 * Hook return types
 */
export interface UseTaskFlowReturn {
  taskFlow: TaskFlow;
  moveTask: (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export interface UseSubAgentUpdatesReturn {
  activeSubAgents: SubAgent[];
  completedSubAgents: SubAgent[];
  totalSubAgents: number;
  hasNewSubAgent: boolean;
}

/**
 * Status Indicator Types
 */
export type StatusColor = 'green' | 'blue' | 'cyan' | 'yellow' | 'red' | 'gray';

export interface StatusIndicatorProps {
  status: AgentStatus | SubAgentStatus | TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  withLabel?: boolean;
}

/**
 * Component Props
 */
export interface MainAgentPanelProps {
  agent: Agent | null;
  isLoading?: boolean;
}

export interface SubAgentPanelProps {
  agent: SubAgent;
}

export interface SubAgentGridProps {
  agents: SubAgent[];
  isLoading?: boolean;
}

export interface TaskFlowKanbanProps {
  taskFlow: TaskFlow;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

export interface LiveFeedProps {
  events: OperationEvent[];
  maxItems?: number;
  isLoading?: boolean;
}

export interface OperationsHeaderProps {
  isConnected: boolean;
  activeSessionCount?: number;
  eventRate?: number;
}

export interface StatusBadgeProps {
  status: AgentStatus | SubAgentStatus | TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ProgressBarProps {
  value: number; // 0-100
  color?: 'cyan' | 'blue' | 'green' | 'yellow' | 'red';
  animated?: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * Utility type for formatting
 */
export interface FormattedEvent {
  timestamp: string;
  type: string;
  message: string;
  agent: string;
  emoji?: string;
}
