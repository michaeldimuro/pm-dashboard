/**
 * Pixel Art Sprite System - LOBSTER EDITION 🦞
 * Pixel art lobster agents with animations
 */

export type SpriteAnimation = 'idle' | 'walking' | 'sitting' | 'working';
export type SpriteDirection = 'left' | 'right' | 'down' | 'up';

/**
 * Color palettes for different lobster agents
 */
export const SPRITE_COLORS = {
  // Xandus - Main agent (Classic lobster red/orange)
  main: {
    shell: '#E63946',      // Deep red shell
    shellLight: '#FF6B6B', // Light red highlights
    shellDark: '#9D0208',  // Dark red shadows
    accent: '#FFB703',     // Orange/gold accents (claws, tail tips)
    eyes: '#000000',       // Black eyes
    eyeWhite: '#FFFFFF',   // Eye whites
  },
  // Sub-agent 1: Electric Blue lobster
  subagent1: {
    shell: '#00B4D8',
    shellLight: '#48CAE4',
    shellDark: '#0077B6',
    accent: '#90E0EF',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
  // Sub-agent 2: Vibrant Purple lobster
  subagent2: {
    shell: '#9B5DE5',
    shellLight: '#C77DFF',
    shellDark: '#7B2CBF',
    accent: '#E0AAFF',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
  // Sub-agent 3: Emerald Green lobster
  subagent3: {
    shell: '#2D6A4F',
    shellLight: '#40916C',
    shellDark: '#1B4332',
    accent: '#95D5B2',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
  // Sub-agent 4: Golden/Yellow lobster
  subagent4: {
    shell: '#FFB703',
    shellLight: '#FFC83D',
    shellDark: '#FB8500',
    accent: '#FFE066',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
  // Sub-agent 5: Pink lobster
  subagent5: {
    shell: '#FF69B4',
    shellLight: '#FFB6C1',
    shellDark: '#DB7093',
    accent: '#FFC0CB',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
  // Sub-agent 6: Cyan lobster
  subagent6: {
    shell: '#00CED1',
    shellLight: '#7FFFD4',
    shellDark: '#008B8B',
    accent: '#E0FFFF',
    eyes: '#000000',
    eyeWhite: '#FFFFFF',
  },
};

/**
 * Sprite dimensions (in pixels)
 */
export const SPRITE_SIZE = {
  width: 40,
  height: 32,
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
    SPRITE_COLORS.subagent5,
    SPRITE_COLORS.subagent6,
  ];
  
  return palettes[index % palettes.length];
}

/**
 * Draw a pixel art lobster sprite on canvas
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
  ctx.save();
  
  // Flip horizontally if facing left
  if (direction === 'left') {
    ctx.translate(x + SPRITE_SIZE.width * SPRITE_SIZE.scale, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  if (animation === 'sitting' || animation === 'working') {
    drawWorkingLobster(ctx, x, y, colors, frame, animation === 'working');
  } else if (animation === 'walking') {
    drawWalkingLobster(ctx, x, y, colors, frame);
  } else {
    drawIdleLobster(ctx, x, y, colors, frame);
  }
  
  ctx.restore();
}

/**
 * Helper to draw a pixel
 */
function px(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
  color: string
) {
  const scale = SPRITE_SIZE.scale;
  ctx.fillStyle = color;
  ctx.fillRect(baseX + dx * scale, baseY + dy * scale, w * scale, h * scale);
}

/**
 * Draw idle lobster with gentle animations
 */
function drawIdleLobster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number
) {
  const p = (dx: number, dy: number, w: number, h: number, color: string) =>
    px(ctx, x, y, dx, dy, w, h, color);

  // Animation phases
  const breathe = Math.sin(frame / 20) * 0.5;
  const clawWave = Math.sin(frame / 15) * 1.5;
  const antennaWave = Math.sin(frame / 10) * 1;
  const eyeBlink = frame % 120 < 5;

  // === ANTENNAE (behind body) ===
  p(16 + antennaWave, 2, 1, 4, colors.shellDark);
  p(17 + antennaWave * 0.5, 0, 1, 3, colors.shellDark);
  p(22 - antennaWave, 2, 1, 4, colors.shellDark);
  p(21 - antennaWave * 0.5, 0, 1, 3, colors.shellDark);

  // === TAIL (behind body) ===
  // Tail segments
  p(0, 14, 4, 6, colors.shell);
  p(1, 13, 3, 2, colors.shellLight);
  p(4, 13, 5, 8, colors.shell);
  p(5, 12, 3, 2, colors.shellLight);
  
  // Tail fan
  p(-2, 12, 3, 2, colors.accent);
  p(-3, 14, 2, 3, colors.accent);
  p(-2, 17, 3, 2, colors.accent);
  p(-1, 19, 2, 2, colors.accent);

  // === BODY (main thorax) ===
  // Main body segments
  p(9, 10 + breathe, 14, 12, colors.shell);
  p(10, 9 + breathe, 12, 2, colors.shellLight);
  p(11, 11 + breathe, 10, 3, colors.shellLight);
  
  // Body shadow/depth
  p(10, 18 + breathe, 12, 3, colors.shellDark);

  // === HEAD ===
  p(20, 6 + breathe, 10, 10, colors.shell);
  p(21, 5 + breathe, 8, 2, colors.shellLight);
  p(22, 7 + breathe, 6, 3, colors.shellLight);
  
  // === EYES ===
  // Eye stalks
  p(22, 4 + breathe, 2, 3, colors.shell);
  p(27, 4 + breathe, 2, 3, colors.shell);
  
  // Eyes
  if (!eyeBlink) {
    p(21, 2 + breathe, 4, 3, colors.eyeWhite);
    p(26, 2 + breathe, 4, 3, colors.eyeWhite);
    p(23, 3 + breathe, 2, 2, colors.eyes);
    p(28, 3 + breathe, 2, 2, colors.eyes);
    // Eye shine
    p(22, 2 + breathe, 1, 1, '#FFFFFF');
    p(27, 2 + breathe, 1, 1, '#FFFFFF');
  } else {
    p(21, 3 + breathe, 4, 1, colors.shellDark);
    p(26, 3 + breathe, 4, 1, colors.shellDark);
  }

  // === CLAWS ===
  // Right claw (big one, in front)
  const rightClawY = 6 + clawWave;
  p(28, rightClawY, 4, 3, colors.shell); // Arm
  p(32, rightClawY - 1, 6, 6, colors.accent); // Claw base
  p(31, rightClawY, 2, 4, colors.shell); // Joint
  // Claw pincers
  p(36, rightClawY - 2, 3, 3, colors.accent);
  p(36, rightClawY + 2, 3, 3, colors.accent);
  p(37, rightClawY, 1, 2, colors.shellDark); // Gap

  // Left claw (smaller, behind body)
  const leftClawY = 18 - clawWave;
  p(24, leftClawY, 3, 2, colors.shell);
  p(27, leftClawY - 1, 5, 5, colors.accent);
  p(31, leftClawY - 1, 2, 2, colors.accent);
  p(31, leftClawY + 2, 2, 2, colors.accent);

  // === LEGS (4 pairs) ===
  const legPhases = [0, 0.5, 1, 1.5];
  const legY = [12, 15, 18, 21];
  const legX = 15;
  
  legPhases.forEach((phase, i) => {
    const legMove = Math.sin(frame / 12 + phase * Math.PI) * 1;
    p(legX + legMove, legY[i], 4, 1, colors.shellDark);
    p(legX + 4 + legMove, legY[i] + 1, 2, 1, colors.shellDark);
  });
}

/**
 * Draw walking lobster with leg animation
 */
function drawWalkingLobster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number
) {
  const p = (dx: number, dy: number, w: number, h: number, color: string) =>
    px(ctx, x, y, dx, dy, w, h, color);

  // Walking bob
  const bob = Math.abs(Math.sin(frame / 6)) * 1;
  const antennaWave = Math.sin(frame / 5) * 2;

  // === ANTENNAE ===
  p(16 + antennaWave, 2 + bob, 1, 4, colors.shellDark);
  p(17 + antennaWave * 0.7, 0 + bob, 1, 3, colors.shellDark);
  p(22 - antennaWave, 2 + bob, 1, 4, colors.shellDark);
  p(21 - antennaWave * 0.7, 0 + bob, 1, 3, colors.shellDark);

  // === TAIL ===
  const tailWave = Math.sin(frame / 8) * 1;
  p(0 + tailWave, 14 + bob, 4, 6, colors.shell);
  p(1 + tailWave, 13 + bob, 3, 2, colors.shellLight);
  p(4 + tailWave * 0.5, 13 + bob, 5, 8, colors.shell);
  p(5 + tailWave * 0.5, 12 + bob, 3, 2, colors.shellLight);
  
  // Tail fan
  p(-2 + tailWave, 12 + bob, 3, 2, colors.accent);
  p(-3 + tailWave, 14 + bob, 2, 3, colors.accent);
  p(-2 + tailWave, 17 + bob, 3, 2, colors.accent);

  // === BODY ===
  p(9, 10 + bob, 14, 12, colors.shell);
  p(10, 9 + bob, 12, 2, colors.shellLight);
  p(11, 11 + bob, 10, 3, colors.shellLight);
  p(10, 18 + bob, 12, 3, colors.shellDark);

  // === HEAD ===
  p(20, 6 + bob, 10, 10, colors.shell);
  p(21, 5 + bob, 8, 2, colors.shellLight);
  
  // === EYES ===
  p(22, 4 + bob, 2, 3, colors.shell);
  p(27, 4 + bob, 2, 3, colors.shell);
  p(21, 2 + bob, 4, 3, colors.eyeWhite);
  p(26, 2 + bob, 4, 3, colors.eyeWhite);
  p(23, 3 + bob, 2, 2, colors.eyes);
  p(28, 3 + bob, 2, 2, colors.eyes);
  p(22, 2 + bob, 1, 1, '#FFFFFF');
  p(27, 2 + bob, 1, 1, '#FFFFFF');

  // === CLAWS (held forward while walking) ===
  p(28, 8 + bob, 4, 3, colors.shell);
  p(32, 6 + bob, 6, 6, colors.accent);
  p(36, 4 + bob, 3, 3, colors.accent);
  p(36, 9 + bob, 3, 3, colors.accent);
  
  p(24, 16 + bob, 3, 2, colors.shell);
  p(27, 15 + bob, 5, 5, colors.accent);
  p(31, 14 + bob, 2, 2, colors.accent);
  p(31, 18 + bob, 2, 2, colors.accent);

  // === ANIMATED LEGS ===
  const legY = [12, 15, 18, 21];
  const legX = 15;
  
  for (let i = 0; i < 4; i++) {
    const legFrame = (frame + i * 3) % 12;
    const legOffset = legFrame < 6 ? legFrame - 3 : 9 - legFrame;
    const legHeight = Math.abs(legOffset) > 2 ? 0 : 1;
    
    p(legX + legOffset, legY[i] + bob - legHeight, 4, 1, colors.shellDark);
    p(legX + 4 + legOffset, legY[i] + 1 + bob - legHeight * 0.5, 2, 1, colors.shellDark);
  }
}

/**
 * Draw working/sitting lobster at desk
 */
function drawWorkingLobster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colors: typeof SPRITE_COLORS.main,
  frame: number,
  isWorking: boolean
) {
  const p = (dx: number, dy: number, w: number, h: number, color: string) =>
    px(ctx, x, y, dx, dy, w, h, color);

  const breathe = Math.sin(frame / 25) * 0.3;
  const antennaWave = Math.sin(frame / 12) * 0.8;
  
  // Typing animation (claws move faster when working)
  const typeSpeed = isWorking ? 4 : 20;
  const typeLeft = Math.sin(frame / typeSpeed) * 1;
  const typeRight = Math.sin(frame / typeSpeed + Math.PI) * 1;

  // === ANTENNAE ===
  p(16 + antennaWave, 4, 1, 4, colors.shellDark);
  p(17 + antennaWave * 0.5, 2, 1, 3, colors.shellDark);
  p(22 - antennaWave, 4, 1, 4, colors.shellDark);
  p(21 - antennaWave * 0.5, 2, 1, 3, colors.shellDark);

  // === TAIL (curled under while sitting) ===
  p(2, 16, 4, 5, colors.shell);
  p(3, 15, 3, 2, colors.shellLight);
  p(6, 15, 4, 6, colors.shell);
  
  // Tail fan (to the side)
  p(0, 17, 3, 2, colors.accent);
  p(-1, 19, 2, 2, colors.accent);

  // === BODY ===
  p(9, 12 + breathe, 14, 10, colors.shell);
  p(10, 11 + breathe, 12, 2, colors.shellLight);
  p(10, 18 + breathe, 12, 3, colors.shellDark);

  // === HEAD (tilted slightly down, looking at screen) ===
  p(20, 8 + breathe, 10, 10, colors.shell);
  p(21, 7 + breathe, 8, 2, colors.shellLight);
  
  // === EYES (focused on screen) ===
  p(22, 6 + breathe, 2, 3, colors.shell);
  p(27, 6 + breathe, 2, 3, colors.shell);
  p(21, 4 + breathe, 4, 3, colors.eyeWhite);
  p(26, 4 + breathe, 4, 3, colors.eyeWhite);
  // Eyes looking down at keyboard
  p(22, 5 + breathe, 2, 2, colors.eyes);
  p(27, 5 + breathe, 2, 2, colors.eyes);
  p(22, 4 + breathe, 1, 1, '#FFFFFF');
  p(27, 4 + breathe, 1, 1, '#FFFFFF');

  // === CLAWS (typing position) ===
  // Right claw
  p(26, 14 + typeRight, 3, 2, colors.shell);
  p(29, 13 + typeRight, 5, 4, colors.accent);
  p(33, 12 + typeRight, 2, 2, colors.accent);
  p(33, 15 + typeRight, 2, 2, colors.accent);
  
  // Left claw
  p(24, 18 + typeLeft, 3, 2, colors.shell);
  p(27, 17 + typeLeft, 5, 4, colors.accent);
  p(31, 16 + typeLeft, 2, 2, colors.accent);
  p(31, 19 + typeLeft, 2, 2, colors.accent);

  // === LEGS (tucked) ===
  const legY = [14, 17, 20];
  legY.forEach((ly, i) => {
    p(14, ly + breathe, 3, 1, colors.shellDark);
    p(17, ly + 1 + breathe, 2, 1, colors.shellDark);
  });

  // === WORK PARTICLES (when actively working) ===
  if (isWorking) {
    const sparkle = frame % 30;
    if (sparkle < 10) {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(x + 34 * SPRITE_SIZE.scale, y + (8 - sparkle / 3) * SPRITE_SIZE.scale, SPRITE_SIZE.scale, SPRITE_SIZE.scale);
    }
    if (sparkle > 15 && sparkle < 25) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(x + 30 * SPRITE_SIZE.scale, y + (6 - (sparkle - 15) / 3) * SPRITE_SIZE.scale, SPRITE_SIZE.scale, SPRITE_SIZE.scale);
    }
    
    // Screen glow effect on lobster
    const glowIntensity = 0.1 + Math.sin(frame / 10) * 0.05;
    ctx.fillStyle = `rgba(0, 255, 255, ${glowIntensity})`;
    ctx.fillRect(x + 20 * SPRITE_SIZE.scale, y + 8 * SPRITE_SIZE.scale, 12 * SPRITE_SIZE.scale, 8 * SPRITE_SIZE.scale);
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
  
  // Limit lines
  const displayLines = lines.slice(0, 3);
  if (lines.length > 3) {
    displayLines[2] = displayLines[2].substring(0, 20) + '...';
  }
  
  // Calculate bubble size
  const bubbleWidth = Math.min(maxWidth, Math.max(...displayLines.map(l => ctx.measureText(l).width)) + padding * 2);
  const bubbleHeight = displayLines.length * (fontSize + 4) + padding * 2;
  
  // Draw bubble background with gradient
  const gradient = ctx.createLinearGradient(x, y, x, y + bubbleHeight);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  gradient.addColorStop(1, 'rgba(240, 240, 250, 0.98)');
  ctx.fillStyle = gradient;
  
  ctx.strokeStyle = '#E63946';
  ctx.lineWidth = 2;
  
  // Rounded rectangle
  const radius = 10;
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
  
  // Draw pointer (claw-like)
  ctx.beginPath();
  ctx.moveTo(x + 20, y + bubbleHeight);
  ctx.lineTo(x + 12, y + bubbleHeight + 12);
  ctx.lineTo(x + 30, y + bubbleHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Draw text
  ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  displayLines.forEach((line, i) => {
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
  const barWidth = 36 * scale;
  const barHeight = 4 * scale;
  
  // Status icon with glow
  const iconSize = 8 * scale;
  const iconY = y - iconSize - 6;
  const iconX = x + (SPRITE_SIZE.width * scale) / 2;
  
  // Glow effect
  const statusColor = getStatusColor(status);
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 8;
  
  // Status dot
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(iconX - 1, iconY - 1, iconSize / 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // Progress bar background
  const barX = x + (SPRITE_SIZE.width * scale - barWidth) / 2;
  const barY = y - barHeight - 2;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Progress bar fill with gradient
  if (progress > 0) {
    const fillWidth = (barWidth * Math.min(100, progress)) / 100;
    const progressGradient = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
    progressGradient.addColorStop(0, statusColor);
    progressGradient.addColorStop(1, lightenColor(statusColor, 30));
    ctx.fillStyle = progressGradient;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
  }
  
  // Progress bar border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

/**
 * Get color for status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#00ff88';
    case 'working':
      return '#00ffff';
    case 'waiting':
      return '#ffaa00';
    case 'idle':
      return '#6b7280';
    default:
      return '#ffffff';
  }
}

/**
 * Lighten a hex color
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
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
  const fontSize = 11;
  
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Background
  const metrics = ctx.measureText(name);
  const bgWidth = metrics.width + 12;
  const bgHeight = fontSize + 6;
  const bgX = x + (SPRITE_SIZE.width * scale) / 2 - bgWidth / 2;
  const bgY = y + SPRITE_SIZE.height * scale + 6;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(bgX + 2, bgY + 2, bgWidth, bgHeight);
  
  // Background with color based on agent type
  if (isMain) {
    const gradient = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgHeight);
    gradient.addColorStop(0, '#E63946');
    gradient.addColorStop(1, '#9D0208');
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  }
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  
  // Border
  ctx.strokeStyle = isMain ? '#FFB703' : '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, x + (SPRITE_SIZE.width * scale) / 2, bgY + 3);
  
  // Crown for main agent 👑
  if (isMain) {
    const crownX = x + (SPRITE_SIZE.width * scale) / 2;
    const crownY = y - 24 * scale;
    
    ctx.fillStyle = '#FFB703';
    // Crown base
    ctx.fillRect(crownX - 8, crownY + 6, 16, 4);
    // Crown points
    ctx.beginPath();
    ctx.moveTo(crownX - 8, crownY + 6);
    ctx.lineTo(crownX - 6, crownY);
    ctx.lineTo(crownX - 4, crownY + 4);
    ctx.lineTo(crownX, crownY - 2);
    ctx.lineTo(crownX + 4, crownY + 4);
    ctx.lineTo(crownX + 6, crownY);
    ctx.lineTo(crownX + 8, crownY + 6);
    ctx.fill();
    
    // Jewel
    ctx.fillStyle = '#E63946';
    ctx.beginPath();
    ctx.arc(crownX, crownY + 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
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
  const iconSize = 14 * scale;
  const iconX = x + SPRITE_SIZE.width * scale + 4;
  const iconY = y - 4;
  
  // Icon background with glow
  ctx.shadowColor = getToolColor(tool);
  ctx.shadowBlur = 6;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Tool color circle
  ctx.fillStyle = getToolColor(tool);
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // Tool emoji
  ctx.font = `${iconSize - 6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getToolEmoji(tool), iconX + iconSize / 2, iconY + iconSize / 2 + 1);
}

function getToolColor(tool: string): string {
  if (tool.includes('browser')) return '#4a9eff';
  if (tool.includes('exec')) return '#ff6b6b';
  if (tool.includes('read') || tool.includes('write')) return '#51cf66';
  if (tool.includes('search')) return '#ffd43b';
  if (tool.includes('message')) return '#ff69b4';
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
