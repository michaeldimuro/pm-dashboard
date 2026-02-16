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
  getAgentColors,
  SPRITE_SIZE,
  type SpriteAnimation,
  type SpriteDirection,
} from '@/lib/pixelSprites';
import {
  renderLobster,
  updateLobsterPosition,
  isPointInLobster,
  LobsterInfoPanel,
  type LobsterState,
} from './AgentLobster';
import type { Agent, SubAgent } from '@/types/operations';

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  
  const [layout] = useState<OfficeLayout>(createDefaultOfficeLayout());
  const [sprites, setSprites] = useState<Map<string, LobsterState>>(new Map());
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  
  const mainAgent = useOperationsStore((state) => state.mainAgent);
  const subAgents = useOperationsStore((state) => state.subAgents);
  const liveFeed = useOperationsStore((state) => state.liveFeed);

  /**
   * Create or update lobster sprite for agent
   */
  const updateAgentSprite = useCallback((
    agent: Agent | SubAgent,
    isMain: boolean,
    existingSprites: Map<string, LobsterState>
  ): LobsterState => {
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
      // Create new lobster sprite with spawn effect
      const entrancePoint: Point = { x: 380, y: 530 }; // Door position
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
        name: isMain ? 'Xandus' : agent.name, // Main agent is always Xandus
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
        spawnTime: Date.now(),
      };
    }
  }, [layout]);

  /**
   * Update sprites based on store state
   */
  useEffect(() => {
    setSprites((prevSprites) => {
      const newSprites = new Map(prevSprites);
      
      // Update main agent (Xandus)
      if (mainAgent) {
        const sprite = updateAgentSprite(mainAgent, true, newSprites);
        newSprites.set(mainAgent.id, sprite);
      }
      
      // Update sub-agents
      Object.values(subAgents).forEach((subAgent) => {
        if (subAgent.status === 'completed' || subAgent.status === 'failed') {
          // Keep completed agents briefly for exit animation, then remove
          const existing = newSprites.get(subAgent.id);
          if (existing) {
            if (existing.spawnTime && Date.now() - existing.spawnTime > 5000) {
              // Agent has been around, let it leave
              if (existing.workstationId) {
                freeWorkstation(layout, existing.workstationId);
              }
              newSprites.delete(subAgent.id);
            } else {
              // Update status but keep visible briefly
              newSprites.set(subAgent.id, {
                ...existing,
                status: subAgent.status,
                animation: 'idle',
              });
            }
          }
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
   * Main animation loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing for better pixel art at scale
    ctx.imageSmoothingEnabled = false;

    const animate = () => {
      frameCountRef.current++;
      const frame = frameCountRef.current;
      
      // Clear canvas with dark background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply zoom and pan
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      // Draw office environment
      drawOfficeEnvironment(ctx, layout);
      
      // Update and draw lobster sprites
      setSprites((prevSprites) => {
        const newSprites = new Map(prevSprites);
        
        // Sort sprites by Y position for proper layering (back to front)
        const sortedSprites = Array.from(newSprites.values()).sort(
          (a, b) => a.position.y - b.position.y
        );
        
        sortedSprites.forEach((sprite) => {
          // Update position if moving along path
          let updatedSprite = updateLobsterPosition(sprite);
          
          // Update animation based on current state
          if (updatedSprite.status === 'working' && updatedSprite.workstationId && !updatedSprite.path) {
            updatedSprite.animation = 'working';
          }
          
          // Render the lobster
          renderLobster({
            state: updatedSprite,
            ctx,
            frame,
            isHovered: hoveredAgent === sprite.id,
          });
          
          newSprites.set(sprite.id, updatedSprite);
        });
        
        return newSprites;
      });
      
      // Draw ambient particles for atmosphere
      drawAmbientParticles(ctx, frame, layout.width, layout.height);
      
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
   * Handle mouse events for hover/click detection
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - pan.x) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - pan.y) / zoom;

    // Check if hovering over any lobster
    let foundAgent: string | null = null;
    sprites.forEach((sprite) => {
      if (isPointInLobster({ x, y }, sprite.position)) {
        foundAgent = sprite.id;
      }
    });

    setHoveredAgent(foundAgent);
    
    // Update cursor
    if (canvas) {
      canvas.style.cursor = foundAgent ? 'pointer' : (isPanning ? 'grabbing' : 'grab');
    }

    // Handle panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - pan.x) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - pan.y) / zoom;

    // Check for click on lobster
    let clickedAgent: string | null = null;
    sprites.forEach((sprite) => {
      if (isPointInLobster({ x, y }, sprite.position)) {
        clickedAgent = sprite.id;
      }
    });

    if (clickedAgent) {
      setSelectedAgent(clickedAgent === selectedAgent ? null : clickedAgent);
    } else if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedAgent(null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(2.5, prev * delta)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Count agents by type
  const mainAgentCount = Array.from(sprites.values()).filter(s => s.isMain).length;
  const subAgentCount = Array.from(sprites.values()).filter(s => !s.isMain).length;
  const workingCount = Array.from(sprites.values()).filter(s => s.status === 'working').length;

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={layout.width}
        height={layout.height}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(2.5, prev * 1.2))}
          className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-all hover:scale-105 border border-gray-700"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.5, prev * 0.8))}
          className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-all hover:scale-105 border border-gray-700"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleResetView}
          className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg text-sm font-mono transition-all hover:scale-105 border border-gray-700"
          title="Reset View"
        >
          ⟲
        </button>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-800/95 backdrop-blur-sm rounded-xl px-4 py-3 text-white font-mono text-sm border border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-lg font-bold border-b border-gray-600 pb-2 mb-1">
            <span>🦞</span>
            <span>Lobster HQ</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: '#E63946' }}
            />
            <span className="text-gray-300">Main Agent:</span>
            <span className="text-cyan-400 font-semibold">{mainAgentCount > 0 ? 'Xandus' : 'Offline'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#00B4D8' }}
            />
            <span className="text-gray-300">Sub-Agents:</span>
            <span className="text-purple-400 font-semibold">{subAgentCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: '#00ff88' }}
            />
            <span className="text-gray-300">Working:</span>
            <span className="text-green-400 font-semibold">{workingCount}</span>
          </div>
          
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
            <div>Click + drag to pan</div>
            <div>Scroll to zoom ({(zoom * 100).toFixed(0)}%)</div>
            <div>Click lobster for details</div>
          </div>
        </div>
      </div>

      {/* Selected agent info panel */}
      {selectedAgent && sprites.has(selectedAgent) && (
        <div className="absolute top-4 left-4">
          <LobsterInfoPanel
            lobster={sprites.get(selectedAgent)!}
            onClose={() => setSelectedAgent(null)}
          />
        </div>
      )}

      {/* Hover tooltip (simplified) */}
      {hoveredAgent && !selectedAgent && sprites.has(hoveredAgent) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/95 backdrop-blur-sm rounded-lg px-4 py-2 text-white font-mono text-sm border border-gray-700 pointer-events-none">
          <div className="flex items-center gap-2">
            <span>🦞</span>
            <span className="font-bold">{sprites.get(hoveredAgent)!.name}</span>
            <span className="text-gray-400">|</span>
            <span className={`${sprites.get(hoveredAgent)!.status === 'working' ? 'text-green-400' : 'text-gray-400'}`}>
              {sprites.get(hoveredAgent)!.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Draw ambient floating particles for atmosphere
 */
function drawAmbientParticles(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number
) {
  const particles = 8;
  
  ctx.save();
  ctx.globalAlpha = 0.3;
  
  for (let i = 0; i < particles; i++) {
    const x = (Math.sin(frame * 0.01 + i * 2) + 1) * (width / 2);
    const y = (frame * 0.3 + i * 100) % (height + 50) - 25;
    const size = 2 + Math.sin(frame * 0.05 + i) * 1;
    
    ctx.fillStyle = i % 2 === 0 ? '#00ffff' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}
