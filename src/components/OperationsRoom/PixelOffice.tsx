/**
 * Pixel Office Component
 * Real-time pixel art visualization of agent activity
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
  type Workstation,
} from '@/lib/officeLayout';
import {
  drawSprite,
  drawSpeechBubble,
  drawStatusIndicator,
  drawNameLabel,
  drawToolIndicator,
  getAgentColors,
  SPRITE_SIZE,
  type SpriteAnimation,
  type SpriteDirection,
} from '@/lib/pixelSprites';
import type { Agent, SubAgent } from '@/types/operations';

interface AgentSprite {
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
}

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  
  const [layout] = useState<OfficeLayout>(createDefaultOfficeLayout());
  const [sprites, setSprites] = useState<Map<string, AgentSprite>>(new Map());
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  
  const mainAgent = useOperationsStore((state) => state.mainAgent);
  const subAgents = useOperationsStore((state) => state.subAgents);
  const liveFeed = useOperationsStore((state) => state.liveFeed);

  /**
   * Create or update sprite for agent
   */
  const updateAgentSprite = useCallback((
    agent: Agent | SubAgent,
    isMain: boolean,
    existingSprites: Map<string, AgentSprite>
  ): AgentSprite => {
    const existing = existingSprites.get(agent.id);
    
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
      // Create new sprite
      const entrancePoint: Point = { x: 400, y: 550 }; // Door position
      const station = findAvailableWorkstation(layout, isMain ? 'main' : 'sub');
      
      let targetPosition: Point | null = null;
      let workstationId: string | null = null;
      let path: Point[] | null = null;
      
      if (station) {
        occupyWorkstation(layout, station.id, agent.id);
        targetPosition = station.position;
        workstationId = station.id;
        path = calculatePath(entrancePoint, station.position);
      }
      
      return {
        id: agent.id,
        name: agent.name,
        isMain,
        position: entrancePoint,
        targetPosition,
        animation: path ? 'walking' : 'idle',
        direction: 'up',
        status: agent.status,
        progress: agent.progress,
        currentTask: agent.currentTask,
        workstationId,
        path,
        pathIndex: 0,
        colorIndex: existingSprites.size,
      };
    }
  }, [layout]);

  /**
   * Update sprites based on store state
   */
  useEffect(() => {
    setSprites((prevSprites) => {
      const newSprites = new Map(prevSprites);
      
      // Update main agent
      if (mainAgent) {
        const sprite = updateAgentSprite(mainAgent, true, newSprites);
        newSprites.set(mainAgent.id, sprite);
      }
      
      // Update sub-agents
      Object.values(subAgents).forEach((subAgent) => {
        if (subAgent.status === 'completed' || subAgent.status === 'failed') {
          // Remove completed/failed agents after animation
          const existing = newSprites.get(subAgent.id);
          if (existing?.workstationId) {
            freeWorkstation(layout, existing.workstationId);
          }
          newSprites.delete(subAgent.id);
        } else {
          const sprite = updateAgentSprite(subAgent, false, newSprites);
          newSprites.set(subAgent.id, sprite);
        }
      });
      
      return newSprites;
    });
  }, [mainAgent, subAgents, updateAgentSprite, layout]);

  /**
   * Track tool usage from live feed
   */
  useEffect(() => {
    const lastEvent = liveFeed[0];
    if (lastEvent && lastEvent.type === 'agent.work_activity') {
      const tool = lastEvent.payload.tool_name as string;
      if (tool) {
        setSprites((prev) => {
          const newSprites = new Map(prev);
          const sprite = newSprites.get(lastEvent.agent_id);
          if (sprite) {
            newSprites.set(lastEvent.agent_id, {
              ...sprite,
              lastToolUsed: tool,
            });
          }
          return newSprites;
        });
      }
    }
  }, [liveFeed]);

  /**
   * Animation loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      frameCountRef.current++;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply zoom and pan
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      // Draw office environment
      drawOfficeEnvironment(ctx, layout);
      
      // Update and draw sprites
      setSprites((prevSprites) => {
        const newSprites = new Map(prevSprites);
        
        newSprites.forEach((sprite) => {
          let updatedSprite = { ...sprite };
          
          // Update position if moving along path
          if (sprite.path && sprite.pathIndex < sprite.path.length) {
            updatedSprite.position = sprite.path[sprite.pathIndex];
            updatedSprite.pathIndex = sprite.pathIndex + 1;
            
            // Update direction based on movement
            if (sprite.pathIndex > 0) {
              const prev = sprite.path[sprite.pathIndex - 1];
              const curr = sprite.path[sprite.pathIndex];
              if (curr.x > prev.x) updatedSprite.direction = 'right';
              else if (curr.x < prev.x) updatedSprite.direction = 'left';
              else if (curr.y < prev.y) updatedSprite.direction = 'up';
              else updatedSprite.direction = 'down';
            }
            
            // Arrived at destination
            if (sprite.pathIndex >= sprite.path.length) {
              updatedSprite.path = null;
              updatedSprite.pathIndex = 0;
              updatedSprite.targetPosition = null;
              updatedSprite.animation = sprite.workstationId ? 'sitting' : 'idle';
            }
          }
          
          // Draw sprite
          const colors = getAgentColors(sprite.isMain, sprite.colorIndex);
          drawSprite(
            ctx,
            sprite.position.x,
            sprite.position.y,
            colors,
            updatedSprite.animation,
            updatedSprite.direction,
            frameCountRef.current
          );
          
          // Draw status indicator
          drawStatusIndicator(
            ctx,
            sprite.position.x,
            sprite.position.y - 10,
            sprite.status as any,
            sprite.progress
          );
          
          // Draw name label
          drawNameLabel(
            ctx,
            sprite.position.x,
            sprite.position.y,
            sprite.name,
            sprite.isMain
          );
          
          // Draw tool indicator if recently used
          if (sprite.lastToolUsed && frameCountRef.current % 120 < 60) {
            drawToolIndicator(
              ctx,
              sprite.position.x,
              sprite.position.y,
              sprite.lastToolUsed
            );
          }
          
          // Draw speech bubble if hovered
          if (hoveredAgent === sprite.id && sprite.currentTask) {
            drawSpeechBubble(
              ctx,
              sprite.position.x - 50,
              sprite.position.y - 80,
              sprite.currentTask,
              200
            );
          }
          
          newSprites.set(sprite.id, updatedSprite);
        });
        
        return newSprites;
      });
      
      ctx.restore();
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [layout, hoveredAgent, zoom, pan]);

  /**
   * Handle mouse events for hover detection
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if hovering over any sprite
    let foundAgent: string | null = null;
    sprites.forEach((sprite) => {
      const spriteWidth = SPRITE_SIZE.width * SPRITE_SIZE.scale;
      const spriteHeight = SPRITE_SIZE.height * SPRITE_SIZE.scale;
      
      if (
        x >= sprite.position.x &&
        x <= sprite.position.x + spriteWidth &&
        y >= sprite.position.y &&
        y <= sprite.position.y + spriteHeight
      ) {
        foundAgent = sprite.id;
      }
    });

    setHoveredAgent(foundAgent);

    // Handle panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(2, prev * delta)));
  };

  /**
   * Reset view
   */
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={layout.width}
        height={layout.height}
        className="w-full h-full cursor-move"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(2, prev * 1.2))}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.5, prev * 0.8))}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetView}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-colors"
          title="Reset View"
        >
          ⟲
        </button>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-3 text-white font-mono text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <span>Agents: {sprites.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Click + drag to pan • Scroll to zoom
          </div>
        </div>
      </div>

      {/* Hovered agent tooltip */}
      {hoveredAgent && (
        <div className="absolute top-4 left-4 bg-gray-800/95 backdrop-blur-sm rounded-lg px-4 py-3 text-white font-mono text-sm max-w-xs">
          {(() => {
            const sprite = sprites.get(hoveredAgent);
            if (!sprite) return null;
            
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sprite.isMain ? '#00ffff' : '#ff00ff' }}
                  ></div>
                  <span className="font-bold">{sprite.name}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Status: <span className="text-cyan-400">{sprite.status}</span></div>
                  <div>Progress: <span className="text-green-400">{sprite.progress}%</span></div>
                  {sprite.currentTask && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-gray-400">Current Task:</div>
                      <div className="text-white mt-1">{sprite.currentTask}</div>
                    </div>
                  )}
                  {sprite.lastToolUsed && (
                    <div className="text-yellow-400 mt-1">
                      🔧 Using: {sprite.lastToolUsed}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
