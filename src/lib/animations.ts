/**
 * Animation Variants Library
 * Reusable Framer Motion animation definitions for Operations Room
 */

export const animationVariants = {
  /**
   * Agent Glow - Pulsing aura when status is "working"
   * Creates a cyan-blue glow effect that pulses smoothly
   */
  agentGlowWorking: {
    animate: {
      boxShadow: [
        '0 0 20px rgba(34,211,238,0.5)',
        '0 0 40px rgba(34,211,238,0.8)',
        '0 0 20px rgba(34,211,238,0.5)',
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },

  /**
   * Sub-Agent Enter/Exit
   * Spring-based smooth entrance and exit animations
   * Scales from 80% to 100% on entry
   */
  subAgentEnter: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },

  /**
   * Sub-Agent Grid Stagger
   * Delays each agent's entrance in sequence
   */
  subAgentGridContainer: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },

  subAgentGridItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },

  /**
   * Task Card Slide
   * Spring-based slide animation for task movement between columns
   * layoutId used for smooth Framer Motion shared layout
   */
  taskCardSlide: {
    layout: true,
    transition: { type: 'spring', damping: 20, stiffness: 100 },
  },

  /**
   * Progress Bar Fill
   * Smooth width animation with gradient shimmer
   */
  progressBarFill: {
    transition: { duration: 0.5, ease: 'easeInOut' },
  },

  /**
   * Live Event Fade In
   * Subtle slide-in from left with fade for new events
   */
  liveEventFadeIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  /**
   * Status Badge Pulse
   * Heartbeat-style pulse on "working" or "active" status
   */
  statusPulse: {
    animate: { opacity: [0.5, 1, 0.5] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },

  /**
   * Completion Celebration
   * Scale and glow animation for task/agent completion
   */
  completionCelebration: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: [0.8, 1.2, 1], opacity: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },

  /**
   * Checkmark Animation
   * Smooth appearance and scale of completion checkmark
   */
  checkmarkAppear: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },

  /**
   * Panel Glow Idle
   * Softer glow for idle/watching state
   */
  panelGlowIdle: {
    animate: {
      boxShadow: [
        '0 0 10px rgba(100,116,139,0.3)',
        '0 0 15px rgba(100,116,139,0.5)',
        '0 0 10px rgba(100,116,139,0.3)',
      ],
    },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },

  /**
   * Live Feed Auto-scroll
   * Smooth scroll down when new events arrive
   */
  liveFeedScroll: {
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  /**
   * Spinner Rotation
   * Continuous rotation for loading/working indicator
   */
  spinnerRotate: {
    animate: { rotate: 360 },
    transition: { duration: 2, repeat: Infinity, linear: true },
  },

  /**
   * Floating Motion
   * Gentle up/down floating for ambient particles
   */
  floatingMotion: {
    animate: { y: [0, -10, 0] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },

  /**
   * Bounce Animation
   * Subtle bounce for emphasis
   */
  bounce: {
    animate: { y: [0, -8, 0] },
    transition: { duration: 0.6, ease: 'easeOut' },
  },

  /**
   * Shimmer/Gradient Animation
   * Animated background gradient shift for visual interest
   */
  shimmer: {
    animate: {
      backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
    },
    transition: { duration: 3, repeat: Infinity, ease: 'linear' },
  },
};

/**
 * Animation utilities
 */

export const easeOutQuad = (x: number): number => {
  return 1 - (1 - x) * (1 - x);
};

export const easeInQuad = (x: number): number => {
  return x * x;
};

export const easeInOutQuad = (x: number): number => {
  return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
};

/**
 * Status color mappings with animation variants
 */
export const statusColorMap = {
  active: { border: 'border-cyan-400', bg: 'bg-cyan-950', text: 'text-cyan-300' },
  working: { border: 'border-blue-400', bg: 'bg-blue-950', text: 'text-blue-300' },
  idle: { border: 'border-slate-400', bg: 'bg-slate-900', text: 'text-slate-300' },
  completed: { border: 'border-green-400', bg: 'bg-green-950', text: 'text-green-300' },
  failed: { border: 'border-red-400', bg: 'bg-red-950', text: 'text-red-300' },
  pending: { border: 'border-yellow-400', bg: 'bg-yellow-950', text: 'text-yellow-300' },
};

/**
 * Tailwind color classes for dynamic status updates
 */
export const getStatusClasses = (status: string): string => {
  const colors = statusColorMap[status as keyof typeof statusColorMap] || statusColorMap.idle;
  return `${colors.border} ${colors.bg} ${colors.text}`;
};
