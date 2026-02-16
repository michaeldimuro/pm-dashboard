/**
 * Progress Bar Component
 * Animated progress bar with gradient shimmer effect
 */

import { motion } from 'framer-motion';
import { animationVariants } from '@/lib/animations';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
  color?: 'cyan' | 'blue' | 'green' | 'red';
}

const colorGradients = {
  cyan: 'from-cyan-400 via-blue-400 to-cyan-400',
  blue: 'from-blue-400 via-cyan-400 to-blue-400',
  green: 'from-green-400 via-emerald-400 to-green-400',
  red: 'from-red-400 via-pink-400 to-red-400',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  showLabel = false,
  animated = true,
  color = 'cyan',
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        {/* Background shimmer */}
        <motion.div
          className="absolute inset-0 bg-slate-700"
          animate={
            animated ? animationVariants.shimmer.animate : {}
          }
          transition={animated ? animationVariants.shimmer.transition : {}}
        />

        {/* Progress fill */}
        <motion.div
          className={`h-full bg-gradient-to-r ${colorGradients[color]} rounded-full`}
          style={{
            width: `${clampedValue}%`,
          }}
          animate={
            animated
              ? {
                  backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                }
              : {}
          }
          transition={
            animated
              ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }
              : {}
          }
        >
          {/* Shimmer effect overlay */}
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.div>
      </div>

      {showLabel && (
        <motion.div
          className="mt-1 text-xs text-slate-400 text-right"
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          {clampedValue}%
        </motion.div>
      )}
    </div>
  );
};

export default ProgressBar;
