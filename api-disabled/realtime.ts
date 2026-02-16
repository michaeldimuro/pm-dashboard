/**
 * Operations Room WebSocket Gateway
 * Vercel Edge Function for real-time agent activity streaming
 *
 * Multiplexes Supabase Realtime events and broadcasts them to connected clients
 */

import { createClient } from '@supabase/supabase-js';

// Types
interface ConnectionState {
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  messageIds: Set<string>;
  lastHeartbeat: number;
}

interface WebSocketMessage {
  channel: string;
  action?: 'subscribe' | 'unsubscribe' | 'ping';
  message_id?: string;
  timestamp?: string;
  data?: unknown;
}

// Constants
const CONNECTIONS = new Map<string, ConnectionState>();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const IDLE_TIMEOUT = 300000; // 5 minutes
const MAX_CONNECTIONS = 1000;
const MESSAGE_DEDUP_SIZE = 1000;

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    params: {
      eventsPerSecond: 100,
    },
  },
});

/**
 * Verify JWT token from query parameter
 */
async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth] Token verification failed:', error?.message);
      return null;
    }

    return { userId: user.id };
  } catch (err) {
    console.error('[Auth] Token verification error:', err);
    return null;
  }
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(
  connectionId: string,
  state: ConnectionState,
  message: WebSocketMessage
) {
  console.log(`[WS] Message from ${connectionId}:`, message.action || message.channel);

  if (message.channel === '_system') {
    if (message.action === 'ping') {
      state.socket.send(
        JSON.stringify({
          channel: '_system',
          data: { type: 'pong' },
          message_id: message.message_id,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } else if (message.action === 'subscribe') {
    subscribeToChannel(connectionId, state, message.channel);
  } else if (message.action === 'unsubscribe') {
    unsubscribeFromChannel(state, message.channel);
  }

  // Update last activity
  state.lastHeartbeat = Date.now();
}

/**
 * Subscribe to a Supabase Realtime channel
 */
function subscribeToChannel(connectionId: string, state: ConnectionState, channel: string) {
  if (state.subscriptions.has(channel)) {
    console.log(`[WS] Already subscribed to ${channel}`);
    return;
  }

  console.log(`[WS] Subscribing ${connectionId} to ${channel}`);

  try {
    supabase
      .channel(channel)
      .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, (payload) => {
        // Broadcast to this connection
        const messageId = `${Date.now()}-${Math.random()}`;

        // Deduplication
        if (state.messageIds.has(messageId)) {
          console.log(`[Dedup] Skipping duplicate: ${messageId}`);
          return;
        }

        state.messageIds.add(messageId);

        // Keep cache bounded
        if (state.messageIds.size > MESSAGE_DEDUP_SIZE) {
          const oldestId = Array.from(state.messageIds)[0];
          state.messageIds.delete(oldestId);
        }

        // Send to client
        if (state.socket.readyState === WebSocket.OPEN) {
          state.socket.send(
            JSON.stringify({
              channel,
              message_id: messageId,
              timestamp: new Date().toISOString(),
              data: payload,
            })
          );
        }
      })
      .subscribe((status, err) => {
        if (err) {
          console.error(`[Realtime] Subscription error for ${channel}:`, err);
          state.socket.send(
            JSON.stringify({
              channel: '_system',
              data: {
                type: 'error',
                message: `Failed to subscribe to ${channel}`,
              },
            })
          );
        } else {
          console.log(`[Realtime] Subscribed to ${channel}:`, status);
          state.subscriptions.add(channel);
        }
      });
  } catch (err) {
    console.error(`[Realtime] Subscription exception for ${channel}:`, err);
  }
}

/**
 * Unsubscribe from a channel
 */
function unsubscribeFromChannel(state: ConnectionState, channel: string) {
  if (!state.subscriptions.has(channel)) {
    return;
  }

  console.log(`[WS] Unsubscribing from ${channel}`);
  supabase.removeChannel(supabase.getChannel(channel)!);
  state.subscriptions.delete(channel);
}

/**
 * Setup heartbeat for a connection
 */
function setupHeartbeat(connectionId: string, state: ConnectionState) {
  const heartbeatInterval = setInterval(() => {
    // Check idle timeout
    if (Date.now() - state.lastHeartbeat > IDLE_TIMEOUT) {
      console.log(`[Heartbeat] Timeout for ${connectionId}`);
      state.socket.close(1000, 'Idle timeout');
      clearInterval(heartbeatInterval);
      return;
    }

    // Send ping
    if (state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(
        JSON.stringify({
          channel: '_system',
          data: { type: 'ping' },
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  return heartbeatInterval;
}

/**
 * Close connection and cleanup
 */
function closeConnection(connectionId: string, state: ConnectionState) {
  console.log(`[WS] Closing connection ${connectionId}`);

  // Unsubscribe from all channels
  state.subscriptions.forEach(channel => {
    unsubscribeFromChannel(state, channel);
  });

  // Close socket
  if (state.socket.readyState !== WebSocket.CLOSED) {
    state.socket.close();
  }

  // Remove from connections map
  CONNECTIONS.delete(connectionId);
}

/**
 * Main handler
 */
export default async function handler(req: Request): Promise<Response> {
  // Only accept GET requests for WebSocket upgrade
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get('upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response(
      JSON.stringify({ error: 'This endpoint requires a WebSocket connection' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get token from query parameters
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing authentication token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify token
  const auth = await verifyToken(token);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check connection pool capacity
  if (CONNECTIONS.size >= MAX_CONNECTIONS) {
    return new Response(JSON.stringify({ error: 'Server at capacity' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Upgrade to WebSocket
  const { socket, response } = Deno.upgrade(req, {
    idleTimeout: 30,
  });

  const connectionId = `${auth.userId}-${Date.now()}`;
  const state: ConnectionState = {
    socket,
    userId: auth.userId,
    subscriptions: new Set(),
    messageIds: new Set(),
    lastHeartbeat: Date.now(),
  };

  // Add to connections map
  CONNECTIONS.set(connectionId, state);
  console.log(`[WS] New connection: ${connectionId} (total: ${CONNECTIONS.size})`);

  // Setup heartbeat
  const heartbeatInterval = setupHeartbeat(connectionId, state);

  // Send welcome message
  socket.send(
    JSON.stringify({
      channel: '_system',
      data: {
        type: 'connected',
        connection_id: connectionId,
        message: 'Connected to Operations Room',
      },
      timestamp: new Date().toISOString(),
    })
  );

  // Handle incoming messages
  socket.onmessage = (event: MessageEvent<string>) => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      handleMessage(connectionId, state, message);
    } catch (err) {
      console.error(`[WS] Parse error for ${connectionId}:`, err);
      socket.send(
        JSON.stringify({
          channel: '_system',
          data: {
            type: 'error',
            message: 'Invalid message format',
          },
        })
      );
    }
  };

  // Handle close
  socket.onclose = () => {
    console.log(`[WS] Connection closed: ${connectionId}`);
    clearInterval(heartbeatInterval);
    closeConnection(connectionId, state);
  };

  // Handle error
  socket.onerror = (err: Event) => {
    console.error(`[WS] Socket error for ${connectionId}:`, err);
    closeConnection(connectionId, state);
  };

  return response;
}

// Export for Vercel
export const config = {
  runtime: 'edge',
};
