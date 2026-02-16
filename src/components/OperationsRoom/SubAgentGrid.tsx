/**
 * Sub-Agent Grid Component
 * Displays multiple sub-agents in a responsive grid with staggered entrance
 * animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { animationVariants } from '@/lib/animations';
import { SubAgentPanel } from './SubAgentPanel';
import type { SubAgent } from '@/types/operations';

interface SubAgentGridProps {
  agents: SubAgent[];
  className?: string;
}

export const SubAgentGrid: React.FC<SubAgentGridProps> = ({
  agents,
  className = '',
}) => {
  if (agents.length === 0) {
    return (
      <motion.div
        className={`py-8 text-center text-slate-500 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p className="text-sm">No sub-agents active</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
      initial={animationVariants.subAgentGridContainer.initial}
      animate={animationVariants.subAgentGridContainer.animate}
      transition={animationVariants.subAgentGridContainer.transition}
    >
      <AnimatePresence mode="popLayout">
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            variants={animationVariants.subAgentGridItem}
            layout
          >
            <SubAgentPanel agent={agent} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubAgentGrid;
