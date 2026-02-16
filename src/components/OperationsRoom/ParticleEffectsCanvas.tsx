/**
 * Particle Effects Canvas Component
 * Renders particle system and visual effects for Operations Room
 *
 * Manages:
 * - Floating particles around active agents
 * - Glow auras for "working" status
 * - Completion burst effects
 * - Task flow arrows
 * - Connection pulse on WebSocket reconnect
 * - Subtle background shimmer
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  ParticleSystem,
  createBurstEffect,
  createGlowAura,
  createDriftParticles,
  createCompletionPulse,
  drawFlowArrow,
  drawBackgroundShimmer,
  drawReconnectPulse,
  FlowArrowState,
} from '@/lib/particles';

interface Agent {
  id: string;
  status: 'active' | 'working' | 'idle' | 'completed' | 'failed';
  x?: number;
  y?: number;
}

interface ParticleEffectsCanvasProps {
  agents?: Agent[];
  taskFlows?: FlowArrowState[];
  isReconnecting?: boolean;
  completions?: { x: number; y: number; timestamp: number }[];
}

export const ParticleEffectsCanvas: React.FC<ParticleEffectsCanvasProps> = ({
  agents = [],
  taskFlows = [],
  isReconnecting = false,
  completions = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDriftTimeRef = useRef<{ [agentId: string]: number }>({});
  const completionProgressRef = useRef<{ [index: number]: number }>({});
  const reconnectProgressRef = useRef<number>(0);
  const hueRef = useRef<number>(0);

  /**
   * Initialize canvas and particle system
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particle system
    particleSystemRef.current = new ParticleSystem(1000);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  /**
   * Handle particle bursts for completions
   */
  useEffect(() => {
    if (!particleSystemRef.current) return;

    completions.forEach((completion, idx) => {
      if (!completionProgressRef.current[idx]) {
        completionProgressRef.current[idx] = 0;
        createBurstEffect(particleSystemRef.current!, completion.x, completion.y, 40);
      }
    });
  }, [completions]);

  /**
   * Handle reconnect pulse
   */
  useEffect(() => {
    if (isReconnecting) {
      reconnectProgressRef.current = 0;
    }
  }, [isReconnecting]);

  /**
   * Main animation loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !particleSystemRef.current) return;

    const animate = () => {
      const system = particleSystemRef.current!;

      // Clear canvas with semi-transparent background for motion blur effect
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // Semi-transparent background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background shimmer
      hueRef.current = (hueRef.current + 0.3) % 360;
      drawBackgroundShimmer(ctx, canvas.width, canvas.height, hueRef.current);

      // Update particle system
      system.update();

      // Emit drift particles for active/working agents
      const now = Date.now();
      agents.forEach((agent) => {
        if (!agent.x || !agent.y) return;

        const isActive = agent.status === 'working' || agent.status === 'active';
        if (!isActive) return;

        // Emit drift particles every 200ms
        const lastTime = lastDriftTimeRef.current[agent.id] || 0;
        if (now - lastTime > 200) {
          createDriftParticles(system, agent.x, agent.y, 2);
          lastDriftTimeRef.current[agent.id] = now;

          // Emit glow aura for working agents
          if (agent.status === 'working') {
            createGlowAura(system, agent.x, agent.y, 30);
          }
        }
      });

      // Draw particles
      system.draw(ctx);

      // Draw task flow arrows
      taskFlows.forEach((arrow) => {
        if (!arrow.active) return;
        arrow.progress = (arrow.progress + 0.02) % 1;
        drawFlowArrow(ctx, arrow);
      });

      // Draw completion pulses
      completions.forEach((completion, idx) => {
        if (!completionProgressRef.current[idx]) {
          completionProgressRef.current[idx] = 0;
        }

        const progress = completionProgressRef.current[idx];
        if (progress < 1) {
          drawFlowArrow(ctx, {
            startX: completion.x,
            startY: completion.y,
            endX: completion.x,
            endY: completion.y,
            progress: 0, // Not a flow, just a burst
            active: true,
          });

          // Draw expanding rings for completion
          createCompletionPulse(ctx, completion.x, completion.y, 0, 80, progress);
          completionProgressRef.current[idx] += 0.03;
        }
      });

      // Draw reconnect pulse
      if (isReconnecting) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        reconnectProgressRef.current = (reconnectProgressRef.current + 0.02) % 1;
        drawReconnectPulse(ctx, centerX, centerY, reconnectProgressRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [agents, taskFlows, isReconnecting, completions]);

  /**
   * Handle click to emit burst effect at cursor position
   * (useful for testing/debugging)
   */
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!particleSystemRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createBurstEffect(particleSystemRef.current, x, y, 30);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        mixBlendMode: 'screen',
        // Allow interaction for debug clicks
        pointerEvents: process.env.NODE_ENV === 'development' ? 'auto' : 'none',
      }}
    />
  );
};

export default ParticleEffectsCanvas;
