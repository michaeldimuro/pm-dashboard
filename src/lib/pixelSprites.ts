/**
 * Pixel Art Sprite System
 * Defines agent appearances, animations, and rendering logic
 */

export type SpriteAnimation = 'idle' | 'walking' | 'sitting' | 'working';
export type SpriteDirection = 'left' | 'right' | 'down' | 'up';

/**
 * Color palettes for different agent types
 */
export const SPRITE_COLORS = {
  main: {
    primary: '#00ffff', // Cyan
    secondary: '#0088ff',
    accent: '#00dddd',
    skin: '#ffcc99',
  },
  subagent1: {
    primary: '#ff00ff', // Magenta
    secondary: '#cc00cc',
    accent: '#ff66ff',
    skin: '#ffddaa',
  },
  subagent2: {
    primary: '#00ff00', // Green
    secondary: '#00cc00',
    accent: '#66ff66',
    skin: '#ffccaa',
  },
  subagent3: {
    primary: '#ffaa00', // Orange
    secondary: '#ff8800',
    accent: '#ffcc66',
    skin: '#ffddbb',
  },
  subagent4: {
    primary: '#ff0088', // Pink
    secondary: '#dd0066',
    accent: '#ff66aa',
    skin: '#ffeedd',
  },
};

/**
 * Sprite dimensions (in pixels)
 */
export const SPRITE_SIZE = {
  width: 32,
  height: 48,
  scale: 2, // Render at 2x for better visibility
};

/**
 * Get color palette for agent
 */
export function getAgentColors(isMain: boolean, index: number = 0) {
  if (isMain) return SPRITE_COLORS.main;
  
  const palettes = [
    SPRITE_COLORS.subagent1,
    SPRITE_COLORS.subagent2,
    SPRITE_COLORS.subagent3,
    SPRITE_COLORS.subagent4,
  ];
  
  return palettes[index % palettes.length];
}

/**
 * Draw a pixel art sprite on canvas
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  animation: SpriteAnimation,
  direction: SpriteDirection,
  frame: number = 0
) {
  const scale = SPRITE_SIZE.scale;
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
  };

  // Clear the sprite area
  ctx.clearRect(x, y, SPRITE_SIZE.width * scale, SPRITE_SIZE.height * scale);

  if (animation === 'sitting') {
    drawSittingSprite(ctx, x, y, colors, frame);
  } else if (animation === 'working') {
    drawWorkingSprite(ctx, x, y, colors, frame);
  } else if (animation === 'walking') {
    drawWalkingSprite(ctx, x, y, colors, direction, frame);
  } else {
    drawIdleSprite(ctx, x, y, colors, frame);
  }
}

/**
 * Draw idle animation
 */
function drawIdleSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number
) {
  const scale = SPRITE_SIZE.scale;
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
  };

  // Head
  px(8, 4, 8, 8, colors.skin);
  
  // Hair/hat
  px(6, 2, 12, 4, colors.primary);
  
  // Eyes (blink animation)
  if (frame % 60 < 55) {
    px(9, 7, 2, 2, '#000000');
    px(13, 7, 2, 2, '#000000');
  }
  
  // Body
  px(7, 12, 10, 8, colors.primary);
  
  // Arms (slight movement)
  const armOffset = Math.sin(frame / 30) * 0.5;
  px(5, 14 + armOffset, 2, 6, colors.secondary);
  px(17, 14 + armOffset, 2, 6, colors.secondary);
  
  // Legs
  px(8, 20, 3, 8, colors.secondary);
  px(13, 20, 3, 8, colors.secondary);
}

/**
 * Draw walking animation
 */
function drawWalkingSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  direction: SpriteDirection,
  frame: number
) {
  const scale = SPRITE_SIZE.scale;
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
  };

  const walkCycle = Math.floor((frame % 40) / 10);
  
  // Head
  px(8, 4, 8, 8, colors.skin);
  
  // Hair
  px(6, 2, 12, 4, colors.primary);
  
  // Eyes
  px(9, 7, 2, 2, '#000000');
  px(13, 7, 2, 2, '#000000');
  
  // Body
  px(7, 12, 10, 8, colors.primary);
  
  // Animated arms
  const armSwing = walkCycle % 2 === 0 ? 2 : -2;
  px(5, 14 + armSwing, 2, 6, colors.secondary);
  px(17, 14 - armSwing, 2, 6, colors.secondary);
  
  // Animated legs
  const legSwing = walkCycle % 2 === 0 ? 2 : -2;
  px(8, 20 + legSwing, 3, 8, colors.secondary);
  px(13, 20 - legSwing, 3, 8, colors.secondary);
}

/**
 * Draw sitting animation
 */
function drawSittingSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number
) {
  const scale = SPRITE_SIZE.scale;
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
  };

  // Head (slightly lower)
  px(8, 8, 8, 8, colors.skin);
  
  // Hair
  px(6, 6, 12, 4, colors.primary);
  
  // Eyes
  px(9, 11, 2, 2, '#000000');
  px(13, 11, 2, 2, '#000000');
  
  // Body
  px(7, 16, 10, 6, colors.primary);
  
  // Arms (on desk/typing)
  px(5, 18, 2, 4, colors.secondary);
  px(17, 18, 2, 4, colors.secondary);
  
  // Legs (sitting position)
  px(8, 22, 3, 4, colors.secondary);
  px(13, 22, 3, 4, colors.secondary);
}

/**
 * Draw working animation (more active typing/movement)
 */
function drawWorkingSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number
) {
  const scale = SPRITE_SIZE.scale;
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx * scale, y + dy * scale, w * scale, h * scale);
  };

  // Head
  px(8, 8, 8, 8, colors.skin);
  
  // Hair
  px(6, 6, 12, 4, colors.primary);
  
  // Eyes (focused)
  px(9, 11, 2, 2, '#000000');
  px(13, 11, 2, 2, '#000000');
  
  // Body
  px(7, 16, 10, 6, colors.primary);
  
  // Animated arms (typing motion)
  const typing = Math.floor((frame % 20) / 5);
  const leftArmY = typing % 2 === 0 ? 0 : 1;
  const rightArmY = typing % 2 === 0 ? 1 : 0;
  
  px(5, 18 + leftArmY, 2, 4, colors.secondary);
  px(17, 18 + rightArmY, 2, 4, colors.secondary);
  
  // Legs
  px(8, 22, 3, 4, colors.secondary);
  px(13, 22, 3, 4, colors.secondary);
  
  // Add work particles/sparkles
  if (frame % 10 < 5) {
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x + 4 * scale, y + 10 * scale, scale, scale);
    ctx.fillRect(x + 20 * scale, y + 12 * scale, scale, scale);
  }
}

/**
 * Draw speech bubble
 */
export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  maxWidth: number = 200
) {
  const padding = 8;
  const fontSize = 12;
  
  ctx.font = `${fontSize}px monospace`;
  
  // Wrap text
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth - padding * 2) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) lines.push(currentLine);
  
  // Calculate bubble size
  const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
  const bubbleHeight = lines.length * (fontSize + 4) + padding * 2;
  
  // Draw bubble background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  
  // Rounded rectangle
  const radius = 8;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + bubbleWidth - radius, y);
  ctx.quadraticCurveTo(x + bubbleWidth, y, x + bubbleWidth, y + radius);
  ctx.lineTo(x + bubbleWidth, y + bubbleHeight - radius);
  ctx.quadraticCurveTo(x + bubbleWidth, y + bubbleHeight, x + bubbleWidth - radius, y + bubbleHeight);
  ctx.lineTo(x + radius, y + bubbleHeight);
  ctx.quadraticCurveTo(x, y + bubbleHeight, x, y + bubbleHeight - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  
  ctx.fill();
  ctx.stroke();
  
  // Draw pointer
  ctx.beginPath();
  ctx.moveTo(x + 20, y + bubbleHeight);
  ctx.lineTo(x + 15, y + bubbleHeight + 10);
  ctx.lineTo(x + 30, y + bubbleHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + i * (fontSize + 4));
  });
}

/**
 * Draw status indicator above sprite
 */
export function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: 'active' | 'idle' | 'working' | 'waiting',
  progress: number
) {
  const scale = SPRITE_SIZE.scale;
  const barWidth = 32 * scale;
  const barHeight = 4 * scale;
  
  // Status icon
  const iconSize = 6 * scale;
  const iconY = y - iconSize - 4;
  
  ctx.fillStyle = getStatusColor(status);
  ctx.beginPath();
  ctx.arc(x + barWidth / 2, iconY, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Progress bar background
  const barY = y - barHeight - 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x, barY, barWidth, barHeight);
  
  // Progress bar fill
  ctx.fillStyle = getStatusColor(status);
  ctx.fillRect(x, barY, (barWidth * progress) / 100, barHeight);
}

/**
 * Get color for status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#00ff00';
    case 'working':
      return '#00ffff';
    case 'waiting':
      return '#ffaa00';
    case 'idle':
      return '#888888';
    default:
      return '#ffffff';
  }
}

/**
 * Draw agent name label
 */
export function drawNameLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  isMain: boolean
) {
  const scale = SPRITE_SIZE.scale;
  const fontSize = 10;
  
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Background
  const metrics = ctx.measureText(name);
  const bgWidth = metrics.width + 8;
  const bgHeight = fontSize + 4;
  const bgX = x + (SPRITE_SIZE.width * scale) / 2 - bgWidth / 2;
  const bgY = y + SPRITE_SIZE.height * scale + 4;
  
  ctx.fillStyle = isMain ? 'rgba(0, 255, 255, 0.8)' : 'rgba(100, 100, 100, 0.8)';
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, x + (SPRITE_SIZE.width * scale) / 2, bgY + 2);
}

/**
 * Draw tool usage indicator
 */
export function drawToolIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tool: string
) {
  const scale = SPRITE_SIZE.scale;
  const iconSize = 12 * scale;
  const iconX = x + SPRITE_SIZE.width * scale - iconSize;
  const iconY = y - iconSize - 2;
  
  // Icon background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(iconX, iconY, iconSize, iconSize);
  
  // Tool icon (simplified representation)
  ctx.fillStyle = getToolColor(tool);
  ctx.fillRect(iconX + 2, iconY + 2, iconSize - 4, iconSize - 4);
  
  // Tool emoji/symbol
  ctx.font = `${iconSize - 4}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getToolEmoji(tool), iconX + iconSize / 2, iconY + iconSize / 2);
}

function getToolColor(tool: string): string {
  if (tool.includes('browser')) return '#4a9eff';
  if (tool.includes('exec')) return '#ff6b6b';
  if (tool.includes('read') || tool.includes('write')) return '#51cf66';
  if (tool.includes('search')) return '#ffd43b';
  return '#868e96';
}

function getToolEmoji(tool: string): string {
  if (tool.includes('browser')) return '🌐';
  if (tool.includes('exec')) return '⚙️';
  if (tool.includes('read') || tool.includes('write')) return '📄';
  if (tool.includes('search')) return '🔍';
  if (tool.includes('message')) return '💬';
  return '🔧';
}
