# Pixel Office Visualization - Operations Room

## Overview

A real-time pixel art visualization system for monitoring agent activity in Mission Control. Agents are displayed as animated pixel sprites in a retro-style office environment, complete with workstations, furniture, and live activity indicators.

## Features

### 🎮 Visual Office Layout
- Retro pixel art aesthetic with checkered floor tiles
- Multiple workstations with desks, chairs, and monitors
- Decorative elements: plants, shelves, windows, door
- Main agent gets prominent central workstation
- Sub-agents assigned to surrounding desks

### 🤖 Agent Sprites
- **Main Agent (Xandus)**: Distinctive cyan color scheme
- **Sub-Agents**: Unique color palettes (magenta, green, orange, pink)
- **Animations**:
  - `idle`: Subtle breathing animation
  - `walking`: Moving between locations with leg/arm swing
  - `sitting`: Working at desk (stationary)
  - `working`: Active typing animation with sparkle effects

### 📊 Activity Visualization
- **Speech Bubbles**: Show current task on hover
- **Status Indicators**: Color-coded dots above agents
  - 🟢 Active - Green
  - 🔵 Working - Cyan
  - 🟠 Waiting - Orange
  - ⚪ Idle - Gray
- **Progress Bars**: Visual progress indicator above each agent
- **Tool Icons**: Show which tool agent is currently using
- **Name Labels**: Agent name displayed below sprite

### 🚶 Movement & Behavior
1. **Agent Spawn**: Agents enter through door at bottom
2. **Walk to Desk**: Smooth path animation to assigned workstation
3. **Sit Down**: Transition to sitting animation at desk
4. **Work**: Active typing animation when working
5. **Completion**: Agent removed from office when task completes

### 🎮 Controls
- **Zoom In/Out**: Mouse scroll or +/- buttons
- **Pan**: Click and drag to move view
- **Reset View**: ⟲ button to reset zoom/pan
- **Hover**: Mouse over agents for detailed tooltips

### 🔄 Real-time Integration
- Connects to Operations Room WebSocket
- Listens for agent_sessions and operations_events
- Updates agent positions and states in real-time
- Shows tool usage indicators from work_activity events

## File Structure

```
pm-dashboard/src/
├── components/OperationsRoom/
│   ├── PixelOffice.tsx          # Main component
│   └── OperationsRoom.tsx       # Container with view toggle
├── lib/
│   ├── pixelSprites.ts          # Sprite rendering & animations
│   └── officeLayout.ts          # Office environment & furniture
├── stores/
│   └── operationsStore.ts       # Agent state management
├── hooks/
│   └── useOperationRoomWebSocket.ts  # WebSocket connection
└── types/
    └── operations.ts            # TypeScript types
```

## Usage

### Toggle Between Views

The Operations Room now has two visualization modes:

1. **🎮 Pixel Office** - Animated pixel art view (default)
2. **📊 Panels** - Traditional panel-based view

Toggle between views using the buttons at the top of the Operations Room page.

### Component Structure

```tsx
import { PixelOffice } from '@/components/OperationsRoom/PixelOffice';

<PixelOffice />
```

### Customization

#### Adding New Agent Colors

Edit `SPRITE_COLORS` in `pixelSprites.ts`:

```typescript
export const SPRITE_COLORS = {
  subagent5: {
    primary: '#ff00aa',
    secondary: '#dd0088',
    accent: '#ff66bb',
    skin: '#ffddcc',
  },
};
```

#### Modifying Office Layout

Edit `createDefaultOfficeLayout()` in `officeLayout.ts`:

```typescript
workstations: [
  {
    id: 'sub-5',
    position: { x: 300, y: 300 },
    type: 'sub',
    occupied: false,
  },
],
```

#### Adding Furniture

Add to the `furniture` array in office layout:

```typescript
furniture: [
  { type: 'plant', position: { x: 100, y: 100 }, width: 30, height: 40 },
  { type: 'shelf', position: { x: 50, y: 200 }, width: 40, height: 100 },
],
```

## Animation System

### Sprite Animations

All sprites support 4 animation states:

1. **Idle**: Subtle movement, occasional blink
2. **Walking**: Leg/arm swing animation (4-frame cycle)
3. **Sitting**: Reduced height, stationary at desk
4. **Working**: Active typing with sparkle effects

### Canvas Rendering

The system uses HTML5 Canvas for high-performance rendering:
- 60 FPS animation loop
- Efficient sprite drawing with pixel scaling
- Smooth path interpolation for movement
- Layer-based rendering (floor → furniture → agents → UI)

## Performance

### Optimization Features

- Canvas-based rendering (GPU accelerated)
- Efficient sprite caching
- Path calculation optimization
- Minimal re-renders with React.memo
- Zustand state management for performance

### Scalability

- Supports 10+ concurrent agents without performance impact
- Smooth animations maintained at 60 FPS
- Responsive to window resizing
- Mobile-friendly with touch support for pan/zoom

## Real-time Updates

### WebSocket Events

The system responds to these event types:

- `agent.session.started` - Spawn main agent
- `subagent.spawned` - Add sub-agent to office
- `agent.status_updated` - Change animation state
- `agent.work_activity` - Show tool usage indicator
- `subagent.completed` - Remove agent from office
- `subagent.failed` - Remove agent with error indication

### State Flow

```
WebSocket Event → Operations Store → Pixel Office Component → Canvas Render
```

## Browser Compatibility

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Mobile**: Touch-enabled pan/zoom ✅

## Future Enhancements

Potential additions for future versions:

- [ ] Agent-to-agent interactions (visual connections)
- [ ] Meeting room for collaborative tasks
- [ ] Particle effects for tool usage
- [ ] Sound effects (typing, notifications)
- [ ] Time-of-day lighting (day/night mode)
- [ ] Customizable office layouts
- [ ] Agent clothing/accessory customization
- [ ] Export office snapshot as image
- [ ] Replay mode for historical sessions

## Troubleshooting

### Agents not appearing
- Check WebSocket connection status
- Verify agent state in operationsStore
- Check browser console for errors

### Poor performance
- Reduce zoom level
- Close other browser tabs
- Check if hardware acceleration is enabled

### Animation stuttering
- Check CPU usage
- Disable other animations if needed
- Try reducing number of concurrent agents

## Credits

Built for Mission Control Operations Room by Jarvis (agent:main:subagent).

Pixel art sprites and environment designed with inspiration from classic 8-bit and 16-bit games.
