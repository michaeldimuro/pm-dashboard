/**
 * Particle System Library for Operations Room
 * Handles particle physics, pooling, and rendering
 */

/**
 * Individual Particle
 * Represents a single particle with position, velocity, and lifecycle
 */
export class Particle {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  life: number; // 0 to 1
  maxLife: number; // in milliseconds
  radius: number;
  color: string;
  opacity: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number = 2000,
    radius: number = 3,
    color: string = 'rgba(34, 211, 238, 1)'
  ) {
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.acceleration = { x: 0, y: 0.5 }; // gravity
    this.life = 1;
    this.maxLife = maxLife;
    this.radius = radius;
    this.color = color;
    this.opacity = 1;
  }

  /**
   * Update particle position and physics
   * dt: delta time in milliseconds since last update
   */
  update(dt: number): void {
    // Apply acceleration to velocity
    this.velocity.x += this.acceleration.x * (dt / 16); // normalized to 60fps
    this.velocity.y += this.acceleration.y * (dt / 16);

    // Apply friction/drag
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Decrease life
    this.life -= dt / this.maxLife;
    if (this.life < 0) this.life = 0;

    // Update opacity based on life
    this.opacity = this.life;
  }

  /**
   * Draw particle on canvas
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isAlive()) return;

    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /**
   * Check if particle is still alive
   */
  isAlive(): boolean {
    return this.life > 0;
  }

  /**
   * Reset particle for pooling
   */
  reset(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    radius: number,
    color: string
  ): void {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = vx;
    this.velocity.y = vy;
    this.acceleration = { x: 0, y: 0.5 };
    this.life = 1;
    this.maxLife = maxLife;
    this.radius = radius;
    this.color = color;
    this.opacity = 1;
  }
}

/**
 * Particle System
 * Manages pool of particles, emission, and rendering
 */
export class ParticleSystem {
  particles: Particle[] = [];
  poolSize: number;
  lastTime: number = Date.now();

  constructor(poolSize: number = 1000) {
    this.poolSize = poolSize;
    // Pre-allocate particle pool
    for (let i = 0; i < poolSize; i++) {
      this.particles.push(new Particle(0, 0, 0, 0));
    }
  }

  /**
   * Emit particles from a point
   * Reuses particles from the pool instead of allocating new ones
   */
  emit(
    x: number,
    y: number,
    count: number,
    options: {
      velocity?: { min: number; max: number }; // speed range
      angle?: { min: number; max: number }; // degrees
      radius?: number;
      color?: string;
      life?: number; // milliseconds
      spread?: number; // radial spread in degrees
    } = {}
  ): void {
    const {
      velocity = { min: 1, max: 5 },
      angle = { min: 0, max: 360 },
      radius = 3,
      color = 'rgba(34, 211, 238, 1)',
      life = 2000,
      spread = 360,
    } = options;

    for (let i = 0; i < count; i++) {
      // Find next available particle in pool
      const particle = this.getAvailableParticle();
      if (!particle) return; // pool exhausted

      // Random angle and velocity
      const randomAngle = Math.random() * spread;
      const randomVelocity =
        velocity.min + Math.random() * (velocity.max - velocity.min);

      // Convert angle to radians
      const radians = (angle.min + randomAngle) * (Math.PI / 180);

      const vx = Math.cos(radians) * randomVelocity;
      const vy = Math.sin(radians) * randomVelocity;

      particle.reset(x, y, vx, vy, life, radius, color);
    }
  }

  /**
   * Get next available particle from pool
   */
  private getAvailableParticle(): Particle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].isAlive()) {
        return this.particles[i];
      }
    }
    return null;
  }

  /**
   * Update all particles
   */
  update(): void {
    const now = Date.now();
    const dt = Math.min(now - this.lastTime, 16); // cap at 60fps
    this.lastTime = now;

    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].isAlive()) {
        this.particles[i].update(dt);
      }
    }
  }

  /**
   * Draw all particles
   */
  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }

  /**
   * Clear all particles
   */
  clear(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].life = 0;
    }
  }

  /**
   * Get count of active particles
   */
  getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].isAlive()) count++;
    }
    return count;
  }
}

/**
 * Specialized Emitter Effects
 */

/**
 * Burst Effect - Radial explosion of particles on completion
 * Used when agent finishes a task
 */
export function createBurstEffect(
  system: ParticleSystem,
  x: number,
  y: number,
  intensity: number = 50
): void {
  system.emit(x, y, intensity, {
    velocity: { min: 3, max: 8 },
    angle: { min: 0, max: 360 },
    radius: 4,
    color: 'rgba(34, 211, 238, 1)',
    life: 1200,
    spread: 360,
  });
}

/**
 * Glow Aura - Pulsing circle of particles around active agent
 * Used for "working" status agents
 */
export function createGlowAura(
  system: ParticleSystem,
  x: number,
  y: number,
  radius: number = 40
): void {
  // Create particles in a circle pattern
  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    system.emit(px, py, 1, {
      velocity: { min: 0.5, max: 1.5 },
      angle: { min: angle * (180 / Math.PI), max: angle * (180 / Math.PI) },
      radius: 2,
      color: 'rgba(34, 211, 238, 0.6)',
      life: 1500,
      spread: 45,
    });
  }
}

/**
 * Drift Particles - Floating particles for ambient motion
 * Gentle upward drift around an agent
 */
export function createDriftParticles(
  system: ParticleSystem,
  x: number,
  y: number,
  count: number = 5
): void {
  system.emit(x, y, count, {
    velocity: { min: 0.2, max: 0.8 },
    angle: { min: 270 - 45, max: 270 + 45 }, // upward
    radius: 2,
    color: 'rgba(59, 130, 246, 0.4)',
    life: 3000,
    spread: 90,
  });
}

/**
 * Completion Pulse - Ring that expands outward
 */
export function createCompletionPulse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  startRadius: number = 0,
  endRadius: number = 100,
  progress: number // 0 to 1
): void {
  const currentRadius = startRadius + (endRadius - startRadius) * progress;
  const opacity = 1 - progress; // fade as it expands

  ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Task Flow Arrow - Animated SVG path animation
 * Creates a flowing arrow between kanban columns
 */
export interface FlowArrowState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number; // 0 to 1
  active: boolean;
}

export function drawFlowArrow(
  ctx: CanvasRenderingContext2D,
  arrow: FlowArrowState
): void {
  if (!arrow.active) return;

  const { startX, startY, endX, endY, progress } = arrow;

  // Interpolate position along the path
  const currentX = startX + (endX - startX) * progress;
  const currentY = startY + (endY - startY) * progress;

  // Draw flowing line
  ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + progress * 0.5})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -progress * 10;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw arrowhead at current position
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowSize = 8;

  ctx.fillStyle = `rgba(34, 211, 238, ${0.5 + progress * 0.5})`;
  ctx.beginPath();
  ctx.moveTo(currentX, currentY);
  ctx.lineTo(
    currentX - arrowSize * Math.cos(angle - Math.PI / 6),
    currentY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    currentX - arrowSize * Math.cos(angle + Math.PI / 6),
    currentY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Background Shimmer - Subtle HSL color animation
 * Creates a gentle color shift in the background
 */
export function drawBackgroundShimmer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hue: number // 0-360
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  // Create a subtle gradient with animated hue
  gradient.addColorStop(
    0,
    `hsl(${hue}, 100%, 5%)`
  );
  gradient.addColorStop(
    0.5,
    `hsl(${(hue + 20) % 360}, 100%, 8%)`
  );
  gradient.addColorStop(
    1,
    `hsl(${(hue + 40) % 360}, 100%, 5%)`
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * WebSocket Reconnect Pulse - Center screen brief animation
 */
export function drawReconnectPulse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number // 0 to 1
): void {
  const maxRadius = 100;
  const radius = maxRadius * progress;
  const opacity = Math.cos(progress * Math.PI) * 0.5 + 0.5; // oscillate

  ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw multiple concentric circles
  for (let i = 1; i < 3; i++) {
    const offset = (progress + i * 0.3) % 1;
    const ringRadius = maxRadius * offset;
    const ringOpacity = (1 - offset) * 0.4;

    ctx.strokeStyle = `rgba(34, 211, 238, ${ringOpacity})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
