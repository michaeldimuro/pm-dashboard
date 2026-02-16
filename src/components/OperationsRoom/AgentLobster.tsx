/**
 * AgentLobster Component
 * Individual pixel lobster character representing an agent
 * 
 * 🦞 Each lobster has:
 * - Unique color based on agent type (main = red/orange, sub = various)
 * - Animations: idle, walking, working, sitting
 * - Status indicators and progress bars
 * - Interactive hover states
 * - Tool usage indicators
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  drawSprite,
  drawStatusIndicator,
  drawNameLabel,
  drawToolIndicator,
  drawSpeechBubble,
  getAgentColors,
  SPRITE_SIZE,
  type SpriteAnimation,
  type SpriteDirection,
} from '@/lib/pixelSprites';
import type { Point } from '@/lib/officeLayout';

export interface LobsterState {
  id: string;
  name: string;
  isMain: boolean;
  position: Point;
  targetPosition: Point | null;
  animation: SpriteAnimation;
  direction: SpriteDirection;
  status: string;
  progress: number;
  currentTask: string;
  workstationId: string | null;
  path: Point[] | null;
  pathIndex: number;
  colorIndex: number;
  lastToolUsed?: string;
  spawnTime?: number;
}

interface AgentLobsterProps {
  state: LobsterState;
  ctx: CanvasRenderingContext2D;
  frame: number;
  isHovered: boolean;
  isSelected?: boolean;
  showDetails?: boolean;
}

/**
 * Render a single lobster agent on canvas
 * This is a pure render function (not a React component that renders to DOM)
 */
export function renderLobster(props: AgentLobsterProps): void {
  const { state, ctx, frame, isHovered, isSelected } = props;
  
  // Get colors for this lobster
  const colors = getAgentColors(state.isMain, state.colorIndex);
  
  // Draw selection indicator if selected
  if (isSelected) {
    drawSelectionIndicator(ctx, state.position.x, state.position.y, frame, colors.shell);
  }
  
  // Draw shadow under lobster
  drawLobsterShadow(ctx, state.position.x, state.position.y);
  
  // Draw the lobster sprite
  drawSprite(
    ctx,
    state.position.x,
    state.position.y,
    colors,
    state.animation,
    state.direction,
    frame
  );
  
  // Draw status indicator (progress bar + status dot)
  drawStatusIndicator(
    ctx,
    state.position.x,
    state.position.y - 12,
    state.status as any,
    state.progress
  );
  
  // Draw name label
  drawNameLabel(
    ctx,
    state.position.x,
    state.position.y,
    state.name,
    state.isMain
  );
  
  // Draw tool indicator if recently used
  if (state.lastToolUsed && frame % 120 < 80) {
    drawToolIndicator(
      ctx,
      state.position.x,
      state.position.y,
      state.lastToolUsed
    );
  }
  
  // Draw speech bubble on hover (but not if selected, since details are in panel)
  if (isHovered && !isSelected && state.currentTask) {
    drawSpeechBubble(
      ctx,
      state.position.x - 50,
      state.position.y - 100,
      state.currentTask,
      220
    );
  }
  
  // Draw "new agent" sparkles for recently spawned agents
  if (state.spawnTime && Date.now() - state.spawnTime < 3000) {
    drawSpawnSparkles(ctx, state.position.x, state.position.y, frame, colors.shell);
  }
}

/**
 * Draw selection indicator around selected lobster
 */
function drawSelectionIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  color: string
) {
  const scale = SPRITE_SIZE.scale;
  const width = SPRITE_SIZE.width * scale;
  const height = SPRITE_SIZE.height * scale;
  const padding = 6;
  
  ctx.save();
  
  // Pulsing effect
  const pulse = 0.6 + Math.sin(frame * 0.1) * 0.4;
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  // Draw rounded rect around lobster
  ctx.beginPath();
  ctx.roundRect(
    x - padding,
    y - padding,
    width + padding * 2,
    height + padding * 2,
    6
  );
  ctx.stroke();
  
  // Corner markers
  ctx.fillStyle = color;
  const markerSize = 4;
  
  // Top-left
  ctx.fillRect(x - padding - 1, y - padding - 1, markerSize, 2);
  ctx.fillRect(x - padding - 1, y - padding - 1, 2, markerSize);
  
  // Top-right
  ctx.fillRect(x + width + padding - markerSize + 2, y - padding - 1, markerSize, 2);
  ctx.fillRect(x + width + padding, y - padding - 1, 2, markerSize);
  
  // Bottom-left
  ctx.fillRect(x - padding - 1, y + height + padding, markerSize, 2);
  ctx.fillRect(x - padding - 1, y + height + padding - markerSize + 2, 2, markerSize);
  
  // Bottom-right
  ctx.fillRect(x + width + padding - markerSize + 2, y + height + padding, markerSize, 2);
  ctx.fillRect(x + width + padding, y + height + padding - markerSize + 2, 2, markerSize);
  
  ctx.restore();
}

/**
 * Draw shadow under lobster for depth
 */
function drawLobsterShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const scale = SPRITE_SIZE.scale;
  const shadowWidth = SPRITE_SIZE.width * scale * 0.8;
  const shadowHeight = 6 * scale;
  
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(
    x + (SPRITE_SIZE.width * scale) / 2,
    y + SPRITE_SIZE.height * scale + 4,
    shadowWidth / 2,
    shadowHeight / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

/**
 * Draw sparkle effects for newly spawned agents
 */
function drawSpawnSparkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  color: string
) {
  const scale = SPRITE_SIZE.scale;
  const centerX = x + (SPRITE_SIZE.width * scale) / 2;
  const centerY = y + (SPRITE_SIZE.height * scale) / 2;
  
  const sparkles = [
    { angle: frame * 0.1, dist: 30, size: 3 },
    { angle: frame * 0.1 + 1, dist: 35, size: 2 },
    { angle: frame * 0.1 + 2, dist: 25, size: 4 },
    { angle: frame * 0.1 + 3, dist: 32, size: 2 },
    { angle: frame * 0.1 + 4, dist: 28, size: 3 },
  ];
  
  ctx.save();
  
  sparkles.forEach((sparkle, i) => {
    const sx = centerX + Math.cos(sparkle.angle + i) * sparkle.dist;
    const sy = centerY + Math.sin(sparkle.angle + i) * sparkle.dist;
    const alpha = 0.3 + Math.sin(frame * 0.2 + i) * 0.3;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    
    // Star shape
    ctx.beginPath();
    for (let j = 0; j < 4; j++) {
      const angle = (j * Math.PI) / 2;
      const r = sparkle.size * scale;
      ctx.lineTo(
        sx + Math.cos(angle) * r,
        sy + Math.sin(angle) * r
      );
      ctx.lineTo(
        sx + Math.cos(angle + Math.PI / 4) * (r * 0.4),
        sy + Math.sin(angle + Math.PI / 4) * (r * 0.4)
      );
    }
    ctx.closePath();
    ctx.fill();
  });
  
  ctx.restore();
}

/**
 * Calculate movement along path
 */
export function updateLobsterPosition(state: LobsterState): LobsterState {
  if (!state.path || state.pathIndex >= state.path.length) {
    return state;
  }
  
  const nextPoint = state.path[state.pathIndex];
  const currentPoint = state.position;
  
  // Calculate direction based on movement
  let direction: SpriteDirection = state.direction;
  const dx = nextPoint.x - currentPoint.x;
  const dy = nextPoint.y - currentPoint.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? 'right' : 'left';
  } else if (Math.abs(dy) > 0.1) {
    direction = dy > 0 ? 'down' : 'up';
  }
  
  const newState: LobsterState = {
    ...state,
    position: nextPoint,
    pathIndex: state.pathIndex + 1,
    direction,
  };
  
  // Check if arrived at destination
  if (state.pathIndex + 1 >= state.path.length) {
    newState.path = null;
    newState.pathIndex = 0;
    newState.targetPosition = null;
    newState.animation = state.workstationId ? 'sitting' : 'idle';
  }
  
  return newState;
}

/**
 * Check if a point is within the lobster's clickable area
 */
export function isPointInLobster(
  point: Point,
  lobsterPosition: Point
): boolean {
  const spriteWidth = SPRITE_SIZE.width * SPRITE_SIZE.scale;
  const spriteHeight = SPRITE_SIZE.height * SPRITE_SIZE.scale;
  
  return (
    point.x >= lobsterPosition.x &&
    point.x <= lobsterPosition.x + spriteWidth &&
    point.y >= lobsterPosition.y &&
    point.y <= lobsterPosition.y + spriteHeight
  );
}

/**
 * Get spawn entrance effect
 * Returns a sequence of positions for dramatic entrance
 */
export function getSpawnAnimation(
  entrancePoint: Point,
  targetPoint: Point,
  duration: number = 20
): Point[] {
  const path: Point[] = [];
  
  // Start slightly off-screen or at door
  const startX = entrancePoint.x;
  const startY = entrancePoint.y + 30; // Start below entrance
  
  // Hop up into frame
  for (let i = 0; i <= duration; i++) {
    const t = i / duration;
    const easeOut = 1 - Math.pow(1 - t, 3);
    
    // Add a little bounce
    const bounce = Math.sin(t * Math.PI * 2) * (1 - t) * 10;
    
    path.push({
      x: startX + (targetPoint.x - startX) * easeOut,
      y: startY + (targetPoint.y - startY) * easeOut - bounce,
    });
  }
  
  return path;
}

/**
 * React component wrapper for lobster info panel (shown on click)
 */
export function LobsterInfoPanel({ 
  lobster, 
  onClose 
}: { 
  lobster: LobsterState; 
  onClose: () => void;
}) {
  const colors = getAgentColors(lobster.isMain, lobster.colorIndex);
  
  return (
    <div 
      className="absolute bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-700 max-w-xs z-50"
      style={{ 
        borderColor: colors.shell,
        boxShadow: `0 0 20px ${colors.shell}40`
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        ✕
      </button>
      
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: colors.shell }}
        >
          🦞
        </div>
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            {lobster.name}
            {lobster.isMain && <span className="text-yellow-400">👑</span>}
          </h3>
          <p className="text-xs text-gray-400">
            {lobster.isMain ? 'Main Agent' : 'Sub-Agent'}
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span 
            className="font-medium"
            style={{ color: getStatusDisplayColor(lobster.status) }}
          >
            {lobster.status}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">Progress</span>
          <span className="text-cyan-400">{lobster.progress}%</span>
        </div>
        
        {lobster.currentTask && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Current Task</p>
            <p className="text-white text-sm">{lobster.currentTask}</p>
          </div>
        )}
        
        {lobster.lastToolUsed && (
          <div className="mt-2">
            <span className="text-gray-400 text-xs">Last tool: </span>
            <span className="text-yellow-400 text-xs">{lobster.lastToolUsed}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusDisplayColor(status: string): string {
  switch (status) {
    case 'active':
    case 'working':
      return '#00ff88';
    case 'waiting':
      return '#ffaa00';
    case 'idle':
      return '#6b7280';
    case 'completed':
      return '#60a5fa';
    case 'failed':
      return '#f87171';
    default:
      return '#ffffff';
  }
}

export default renderLobster;
