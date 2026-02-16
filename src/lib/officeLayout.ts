/**
 * Office Layout System
 * Defines workstations, furniture, and office environment
 */

export interface Point {
  x: number;
  y: number;
}

export interface Workstation {
  id: string;
  position: Point;
  type: 'main' | 'sub' | 'idle';
  occupied: boolean;
  assignedAgentId?: string;
}

export interface Furniture {
  type: 'desk' | 'chair' | 'plant' | 'window' | 'door' | 'shelf' | 'monitor';
  position: Point;
  width: number;
  height: number;
}

export interface OfficeLayout {
  width: number;
  height: number;
  workstations: Workstation[];
  furniture: Furniture[];
  floor: {
    tileSize: number;
    color1: string;
    color2: string;
  };
  walls: {
    color: string;
    thickness: number;
  };
}

/**
 * Create default office layout
 */
export function createDefaultOfficeLayout(): OfficeLayout {
  const TILE_SIZE = 32;
  const OFFICE_WIDTH = 800;
  const OFFICE_HEIGHT = 600;

  return {
    width: OFFICE_WIDTH,
    height: OFFICE_HEIGHT,
    
    floor: {
      tileSize: TILE_SIZE,
      color1: '#2d3436',
      color2: '#212529',
    },
    
    walls: {
      color: '#1a1d1f',
      thickness: 16,
    },
    
    workstations: [
      // Main agent workstation (center, prominent)
      {
        id: 'main-1',
        position: { x: 350, y: 250 },
        type: 'main',
        occupied: false,
      },
      
      // Sub-agent workstations (arranged around the room)
      {
        id: 'sub-1',
        position: { x: 150, y: 150 },
        type: 'sub',
        occupied: false,
      },
      {
        id: 'sub-2',
        position: { x: 550, y: 150 },
        type: 'sub',
        occupied: false,
      },
      {
        id: 'sub-3',
        position: { x: 150, y: 400 },
        type: 'sub',
        occupied: false,
      },
      {
        id: 'sub-4',
        position: { x: 550, y: 400 },
        type: 'sub',
        occupied: false,
      },
      
      // Additional idle stations
      {
        id: 'idle-1',
        position: { x: 100, y: 280 },
        type: 'idle',
        occupied: false,
      },
      {
        id: 'idle-2',
        position: { x: 600, y: 280 },
        type: 'idle',
        occupied: false,
      },
    ],
    
    furniture: [
      // Main desk
      { type: 'desk', position: { x: 340, y: 260 }, width: 80, height: 50 },
      { type: 'chair', position: { x: 355, y: 290 }, width: 30, height: 30 },
      { type: 'monitor', position: { x: 360, y: 240 }, width: 40, height: 30 },
      
      // Sub-agent desks
      { type: 'desk', position: { x: 140, y: 160 }, width: 60, height: 40 },
      { type: 'chair', position: { x: 152, y: 185 }, width: 25, height: 25 },
      { type: 'monitor', position: { x: 155, y: 145 }, width: 30, height: 25 },
      
      { type: 'desk', position: { x: 540, y: 160 }, width: 60, height: 40 },
      { type: 'chair', position: { x: 552, y: 185 }, width: 25, height: 25 },
      { type: 'monitor', position: { x: 555, y: 145 }, width: 30, height: 25 },
      
      { type: 'desk', position: { x: 140, y: 410 }, width: 60, height: 40 },
      { type: 'chair', position: { x: 152, y: 435 }, width: 25, height: 25 },
      { type: 'monitor', position: { x: 155, y: 395 }, width: 30, height: 25 },
      
      { type: 'desk', position: { x: 540, y: 410 }, width: 60, height: 40 },
      { type: 'chair', position: { x: 552, y: 435 }, width: 25, height: 25 },
      { type: 'monitor', position: { x: 555, y: 395 }, width: 30, height: 25 },
      
      // Idle area furniture
      { type: 'desk', position: { x: 90, y: 290 }, width: 50, height: 35 },
      { type: 'chair', position: { x: 100, y: 310 }, width: 20, height: 20 },
      
      { type: 'desk', position: { x: 590, y: 290 }, width: 50, height: 35 },
      { type: 'chair', position: { x: 600, y: 310 }, width: 20, height: 20 },
      
      // Decorative elements
      { type: 'plant', position: { x: 50, y: 50 }, width: 30, height: 40 },
      { type: 'plant', position: { x: 720, y: 50 }, width: 30, height: 40 },
      { type: 'plant', position: { x: 50, y: 510 }, width: 30, height: 40 },
      { type: 'plant', position: { x: 720, y: 510 }, width: 30, height: 40 },
      
      { type: 'shelf', position: { x: 20, y: 200 }, width: 40, height: 100 },
      { type: 'shelf', position: { x: 740, y: 200 }, width: 40, height: 100 },
      
      // Windows
      { type: 'window', position: { x: 200, y: 20 }, width: 100, height: 40 },
      { type: 'window', position: { x: 500, y: 20 }, width: 100, height: 40 },
      
      // Door
      { type: 'door', position: { x: 380, y: 570 }, width: 40, height: 20 },
    ],
  };
}

/**
 * Draw the office environment
 */
export function drawOfficeEnvironment(
  ctx: CanvasRenderingContext2D,
  layout: OfficeLayout
) {
  // Draw floor tiles
  drawFloor(ctx, layout);
  
  // Draw walls
  drawWalls(ctx, layout);
  
  // Draw furniture (back to front for proper layering)
  const sortedFurniture = [...layout.furniture].sort((a, b) => a.position.y - b.position.y);
  sortedFurniture.forEach((furniture) => {
    drawFurniture(ctx, furniture);
  });
}

/**
 * Draw checkered floor
 */
function drawFloor(ctx: CanvasRenderingContext2D, layout: OfficeLayout) {
  const { tileSize, color1, color2 } = layout.floor;
  
  for (let y = 0; y < layout.height; y += tileSize) {
    for (let x = 0; x < layout.width; x += tileSize) {
      const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isEven ? color1 : color2;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
}

/**
 * Draw walls
 */
function drawWalls(ctx: CanvasRenderingContext2D, layout: OfficeLayout) {
  const { color, thickness } = layout.walls;
  
  ctx.fillStyle = color;
  
  // Top wall
  ctx.fillRect(0, 0, layout.width, thickness);
  
  // Bottom wall
  ctx.fillRect(0, layout.height - thickness, layout.width, thickness);
  
  // Left wall
  ctx.fillRect(0, 0, thickness, layout.height);
  
  // Right wall
  ctx.fillRect(layout.width - thickness, 0, thickness, layout.height);
  
  // Add wall trim
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 2;
  ctx.strokeRect(thickness, thickness, layout.width - thickness * 2, layout.height - thickness * 2);
}

/**
 * Draw individual furniture piece
 */
function drawFurniture(ctx: CanvasRenderingContext2D, furniture: Furniture) {
  const { type, position, width, height } = furniture;
  
  switch (type) {
    case 'desk':
      drawDesk(ctx, position.x, position.y, width, height);
      break;
    case 'chair':
      drawChair(ctx, position.x, position.y, width, height);
      break;
    case 'monitor':
      drawMonitor(ctx, position.x, position.y, width, height);
      break;
    case 'plant':
      drawPlant(ctx, position.x, position.y, width, height);
      break;
    case 'window':
      drawWindow(ctx, position.x, position.y, width, height);
      break;
    case 'door':
      drawDoor(ctx, position.x, position.y, width, height);
      break;
    case 'shelf':
      drawShelf(ctx, position.x, position.y, width, height);
      break;
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Desk surface
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x, y, w, h);
  
  // Highlight
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(x, y, w, h * 0.3);
  
  // Shadow
  ctx.fillStyle = '#654321';
  ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
  
  // Border
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Seat
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x, y + h * 0.5, w, h * 0.4);
  
  // Backrest
  ctx.fillStyle = '#34495e';
  ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.6);
  
  // Legs (simplified)
  ctx.fillStyle = '#1a252f';
  ctx.fillRect(x + 2, y + h - 6, 3, 6);
  ctx.fillRect(x + w - 5, y + h - 6, 3, 6);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Monitor frame
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x, y, w, h);
  
  // Screen
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  
  // Screen glow
  const gradient = ctx.createRadialGradient(
    x + w / 2, y + h / 2, 0,
    x + w / 2, y + h / 2, w / 2
  );
  gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 100, 100, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  
  // Stand
  ctx.fillStyle = '#333333';
  ctx.fillRect(x + w / 2 - 3, y + h, 6, 8);
  ctx.fillRect(x + w / 2 - 8, y + h + 8, 16, 3);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Pot
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x + w * 0.2, y + h * 0.7, w * 0.6, h * 0.3);
  
  // Leaves
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x + w * 0.3, y + h * 0.3, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.2, w * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x + w * 0.7, y + h * 0.35, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Darker accent leaves
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.4, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Window frame
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x, y, w, h);
  
  // Glass panes
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(x + 4, y + 4, w / 2 - 6, h - 8);
  ctx.fillRect(x + w / 2 + 2, y + 4, w / 2 - 6, h - 8);
  
  // Light effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x + 4, y + 4, w - 8, h * 0.3);
  
  // Cross bar
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Door
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x, y, w, h);
  
  // Door handle
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x + w * 0.7, y + h / 2, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Door panel
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
}

function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shelf background
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x, y, w, h);
  
  // Shelves
  const shelfCount = 3;
  const shelfHeight = h / shelfCount;
  
  ctx.fillStyle = '#8b7355';
  for (let i = 0; i < shelfCount; i++) {
    ctx.fillRect(x, y + i * shelfHeight, w, 4);
  }
  
  // Items on shelves (simplified)
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(x + 5, y + shelfHeight - 10, 8, 10);
  ctx.fillRect(x + 18, y + shelfHeight - 8, 10, 8);
  
  ctx.fillStyle = '#f87171';
  ctx.fillRect(x + 8, y + shelfHeight * 2 - 12, 6, 12);
  ctx.fillRect(x + 20, y + shelfHeight * 2 - 10, 8, 10);
}

/**
 * Find available workstation for agent
 */
export function findAvailableWorkstation(
  layout: OfficeLayout,
  agentType: 'main' | 'sub'
): Workstation | null {
  const available = layout.workstations.find(
    (ws) => !ws.occupied && (ws.type === agentType || ws.type === 'idle')
  );
  
  return available || null;
}

/**
 * Get workstation by ID
 */
export function getWorkstation(
  layout: OfficeLayout,
  id: string
): Workstation | undefined {
  return layout.workstations.find((ws) => ws.id === id);
}

/**
 * Mark workstation as occupied
 */
export function occupyWorkstation(
  layout: OfficeLayout,
  workstationId: string,
  agentId: string
): void {
  const station = layout.workstations.find((ws) => ws.id === workstationId);
  if (station) {
    station.occupied = true;
    station.assignedAgentId = agentId;
  }
}

/**
 * Free workstation
 */
export function freeWorkstation(
  layout: OfficeLayout,
  workstationId: string
): void {
  const station = layout.workstations.find((ws) => ws.id === workstationId);
  if (station) {
    station.occupied = false;
    station.assignedAgentId = undefined;
  }
}

/**
 * Calculate path between two points (simple A* would go here for complex layouts)
 */
export function calculatePath(from: Point, to: Point): Point[] {
  // Simple linear interpolation for now
  const steps = 20;
  const path: Point[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  
  return path;
}
