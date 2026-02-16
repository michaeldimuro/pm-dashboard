/**
 * Pixel Office Component - LOBSTER EDITION 🦞
 * Real-time pixel art visualization of agent activity with lobster characters
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOperationsStore } from '@/stores/operationsStore';
import {
  createDefaultOfficeLayout,
  drawOfficeEnvironment,
  findAvailableWorkstation,
  occupyWorkstation,
  freeWorkstation,
  calculatePath,
  type OfficeLayout,
  type Point,
} from '@/lib/officeLayout';
import {
  renderLobster,
  updateLobsterPosition,
  isPointInLobster,
  type LobsterState,
} from './AgentLobster';
import type { Agent, SubAgent } from '@/types/operations';
import type { SpriteAnimation } from '@/lib/pixelSprites';

// Canvas dimensions - smaller, contained size
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

interface PixelOfficeProps {
  onAgentSelect?: (agentId: string | null) => void;
  selectedAgentId?: string | null;
}

export function PixelOffice({ onAgentSelect, selectedAgentId }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  
  const [layout] = useState<OfficeLayout>(() => createDefaultOfficeLayout(CANVAS_WIDTH, CANVAS_HEIGHT));
  const spritesRef = useRef<Map<string, LobsterState>>(new Map());
  const [spriteCount, setSpriteCount] = useState(0); // For UI updates
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  
  const mainAgent = useOperationsStore((state) => state.mainAgent);
  const subAgents = useOperationsStore((state) => state.subAgents);
  const liveFeed = useOperationsStore((state) => state.liveFeed);

  /**
   * Create or update lobster sprite for agent
   */
  const updateAgentSprite = useCallback((
    agent: Agent | SubAgent,
    isMain: boolean
  ): LobsterState => {
    const existing = spritesRef.current.get(agent.id);
    
    if (existing) {
      // Update existing sprite
      const needsNewStation = 
        (agent.status === 'working' || agent.status === 'active') && 
        !existing.workstationId;
      
      if (needsNewStation) {
        const station = findAvailableWorkstation(layout, isMain ? 'main' : 'sub');
        if (station) {
          occupyWorkstation(layout, station.id, agent.id);
          const path = calculatePath(existing.position, station.position);
          return {
            ...existing,
            status: agent.status,
            progress: agent.progress,
            currentTask: agent.currentTask,
            workstationId: station.id,
            targetPosition: station.position,
            path,
            pathIndex: 0,
            animation: 'walking',
          };
        }
      }
      
      // Update animation based on status
      let animation: SpriteAnimation = 'idle';
      if (existing.path && existing.pathIndex < existing.path.length) {
        animation = 'walking';
      } else if (agent.status === 'working' && existing.workstationId) {
        animation = 'working';
      } else if (existing.workstationId) {
        animation = 'sitting';
      }
      
      return {
        ...existing,
        status: agent.status,
        progress: agent.progress,
        currentTask: agent.currentTask,
        animation,
      };
    } else {
      // Create new lobster sprite - spawn directly at workstation for now
      const station = findAvailableWorkstation(layout, isMain ? 'main' : 'sub');
      
      // Default position (center of canvas) if no station available
      let position: Point = { x: CANVAS_WIDTH / 2 - 40, y: CANVAS_HEIGHT / 2 - 30 };
      let workstationId: string | null = null;
      
      if (station) {
        occupyWorkstation(layout, station.id, agent.id);
        position = { ...station.position };
        workstationId = station.id;
      }
      
      return {
        id: agent.id,
        name: isMain ? 'Xandus' : agent.name,
        isMain,
        position,
        targetPosition: null,
        animation: workstationId ? 'working' : 'idle',
        direction: 'right',
        status: agent.status,
        progress: agent.progress,
        currentTask: agent.currentTask,
        workstationId,
        path: null,
        pathIndex: 0,
        colorIndex: spritesRef.current.size,
        spawnTime: Date.now(),
      };
    }
  }, [layout]);

  /**
   * Update sprites based on store state
   */
  useEffect(() => {
    // Update main agent (Xandus)
    if (mainAgent) {
      const sprite = updateAgentSprite(mainAgent, true);
      spritesRef.current.set(mainAgent.id, sprite);
    }
    
    // Update sub-agents
    Object.values(subAgents).forEach((subAgent) => {
      if (subAgent.status === 'completed' || subAgent.status === 'failed') {
        const existing = spritesRef.current.get(subAgent.id);
        if (existing) {
          if (existing.spawnTime && Date.now() - existing.spawnTime > 5000) {
            if (existing.workstationId) {
              freeWorkstation(layout, existing.workstationId);
            }
            spritesRef.current.delete(subAgent.id);
          } else {
            spritesRef.current.set(subAgent.id, {
              ...existing,
              status: subAgent.status,
              animation: 'idle',
            });
          }
        }
      } else {
        const sprite = updateAgentSprite(subAgent, false);
        spritesRef.current.set(subAgent.id, sprite);
      }
    });
    
    setSpriteCount(spritesRef.current.size);
  }, [mainAgent, subAgents, updateAgentSprite, layout]);

  /**
   * Track tool usage from live feed
   */
  useEffect(() => {
    const lastEvent = liveFeed[0];
    if (lastEvent && lastEvent.type === 'agent.work_activity') {
      const tool = lastEvent.payload.tool_name as string;
      if (tool) {
        const sprite = spritesRef.current.get(lastEvent.agent_id);
        if (sprite) {
          spritesRef.current.set(lastEvent.agent_id, {
            ...sprite,
            lastToolUsed: tool,
          });
        }
      }
    }
  }, [liveFeed]);

  /**
   * Main animation loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const animate = () => {
      frameCountRef.current++;
      const frame = frameCountRef.current;
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw office environment
      drawOfficeEnvironment(ctx, layout);
      
      // Update and draw lobster sprites
      const sprites = spritesRef.current;
      
      // Sort sprites by Y position for proper layering
      const sortedSprites = Array.from(sprites.values()).sort(
        (a, b) => a.position.y - b.position.y
      );
      
      sortedSprites.forEach((sprite) => {
        let updatedSprite = updateLobsterPosition(sprite);
        
        if (updatedSprite.status === 'working' && updatedSprite.workstationId && !updatedSprite.path) {
          updatedSprite.animation = 'working';
        }
        
        // Render the lobster
        renderLobster({
          state: updatedSprite,
          ctx,
          frame,
          isHovered: hoveredAgent === sprite.id,
          isSelected: selectedAgentId === sprite.id,
        });
        
        sprites.set(sprite.id, updatedSprite);
      });
      
      // Draw ambient particles
      drawAmbientParticles(ctx, frame, canvas.width, canvas.height);
      
      // Draw "no agents" message if empty
      if (spritesRef.current.size === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🦞 Waiting for agents...', canvas.width / 2, canvas.height / 2);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [layout, hoveredAgent, selectedAgentId]);

  /**
   * Handle mouse events
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let foundAgent: string | null = null;
    spritesRef.current.forEach((sprite) => {
      if (isPointInLobster({ x, y }, sprite.position)) {
        foundAgent = sprite.id;
      }
    });

    setHoveredAgent(foundAgent);
    canvas.style.cursor = foundAgent ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let clickedAgent: string | null = null;
    spritesRef.current.forEach((sprite) => {
      if (isPointInLobster({ x, y }, sprite.position)) {
        clickedAgent = sprite.id;
      }
    });

    if (onAgentSelect) {
      onAgentSelect(clickedAgent === selectedAgentId ? null : clickedAgent);
    }
  };

  // Count agents (use spriteCount state for reactivity, but calculate from ref)
  const mainAgentCount = Array.from(spritesRef.current.values()).filter(s => s.isMain).length;
  const subAgentCount = Array.from(spritesRef.current.values()).filter(s => !s.isMain).length;
  const workingCount = Array.from(spritesRef.current.values()).filter(s => s.status === 'working').length;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas container with aspect ratio */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full border border-slate-700 rounded-lg shadow-2xl"
          style={{ imageRendering: 'pixelated' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
      </div>
      
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 text-xs font-mono border-t border-slate-700">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-bold">🦞 Lobster HQ</span>
          <span className="text-gray-400">
            Main: <span className={mainAgentCount > 0 ? 'text-green-400' : 'text-gray-500'}>{mainAgentCount > 0 ? 'Xandus' : 'Offline'}</span>
          </span>
          <span className="text-gray-400">
            Sub: <span className="text-purple-400">{subAgentCount}</span>
          </span>
          <span className="text-gray-400">
            Working: <span className="text-green-400">{workingCount}</span>
          </span>
        </div>
        
        {/* Hover hint */}
        {hoveredAgent && spritesRef.current.has(hoveredAgent) && (
          <span className="text-white">
            <span className="text-gray-400">Hover:</span> {spritesRef.current.get(hoveredAgent)!.name}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Draw ambient floating particles
 */
function drawAmbientParticles(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number
) {
  const particles = 6;
  
  ctx.save();
  ctx.globalAlpha = 0.2;
  
  for (let i = 0; i < particles; i++) {
    const x = (Math.sin(frame * 0.008 + i * 1.5) + 1) * (width / 2);
    const y = (frame * 0.2 + i * 80) % (height + 30) - 15;
    const size = 2 + Math.sin(frame * 0.04 + i) * 1;
    
    ctx.fillStyle = i % 2 === 0 ? '#00ffff' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}
